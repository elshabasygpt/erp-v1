<?php

namespace App\Jobs;

use App\Domain\Sales\Repositories\InvoiceRepositoryInterface;
use App\Infrastructure\Eloquent\Models\InvoiceModel;
use App\Infrastructure\Zatca\UblXmlGenerator;
use App\Infrastructure\Zatca\ZatcaOnboardingService;
use App\Infrastructure\Zatca\ZatcaXmlSigner;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class SubmitZatcaInvoiceJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public string $invoiceId,
        public string $tenantId // Passing tenant context is critical for jobs
    ) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        // Must switch to tenant DB context before running in queue
        DB::setDefaultConnection('tenant');

        $model = InvoiceModel::query()->with('items.product')->find($this->invoiceId);
        if (! $model) {
            return;
        }

        // Convert to domain entity for the XML Generator
        $invoiceEntity = app(InvoiceRepositoryInterface::class)->findById($this->invoiceId);
        if (! $invoiceEntity) {
            return;
        }

        // Get CSID for auth and other settings
        $zatcaService = app(ZatcaOnboardingService::class);

        // Extract settings
        $sellerName = $zatcaService->getTenantSetting('company_name') ?? 'شركة تجريبية';
        $vatNumber = $zatcaService->getTenantSetting('vat_number') ?? '300000000000003';

        $zatcaUuid = Str::uuid()->toString();
        $xml = UblXmlGenerator::generateInvoiceXml($invoiceEntity, $sellerName, $vatNumber, $zatcaUuid);

        // Sign the XML if credentials exist
        $signer = new ZatcaXmlSigner;
        $xmlHash = $signer->hashXml($xml);

        $privateKeyPem = $zatcaService->getTenantSetting('zatca_private_key');
        $certificatePem = $zatcaService->getTenantSetting('zatca_certificate');

        if ($privateKeyPem && $certificatePem) {
            $signature = $signer->signXml($xmlHash, $privateKeyPem);
            $xml = $signer->embedSignature($xml, $signature, $xmlHash, $certificatePem);
            // Re-hash after embedding signature
            $xmlHash = base64_encode(hash('sha256', $xml, true));
        }

        $csidToken = $zatcaService->getTenantSetting('zatca_compliance_csid');
        $secret = $zatcaService->getTenantSetting('zatca_compliance_secret');

        // If no credentials, we can't report but we can still save the generated XML
        if (! $csidToken || ! $secret) {
            $model->update([
                'zatca_xml' => $xml,
                'zatca_hash' => $xmlHash,
                'zatca_uuid' => $zatcaUuid,
                'zatca_status' => 'pending', // Awaiting onboarding
                'zatca_error_message' => 'Pending ZATCA onboarding. No CSID found.',
            ]);

            return;
        }

        // Execute Real HTTP POST to ZATCA Core APIs (Simulation Endpoint)
        $response = Http::withBasicAuth($csidToken, $secret)
            ->withHeaders([
                'Accept-Version' => 'V2',
                'Clearance-Status' => '1',
                'Accept-Language' => 'en',
            ])->post($zatcaService->getBaseUrl().'/invoices/reporting/single', [
                'invoiceHash' => $xmlHash,
                'uuid' => $zatcaUuid,
                'invoice' => base64_encode($xml),
            ]);

        if ($response->successful() && isset($response['validationResults']['infoMessages'])) {
            $model->update([
                'zatca_xml' => $xml,
                'zatca_hash' => $xmlHash,
                'zatca_uuid' => $zatcaUuid,
                'zatca_status' => 'reported',
                'zatca_error_message' => null,
            ]);
        } else {
            $model->update([
                'zatca_xml' => $xml,
                'zatca_hash' => $xmlHash,
                'zatca_uuid' => $zatcaUuid,
                'zatca_status' => 'failed',
                'zatca_error_message' => $response->body(),
            ]);
        }
    }
}
