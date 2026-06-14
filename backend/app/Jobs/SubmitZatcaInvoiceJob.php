<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Domain\Sales\Entities\Invoice;
use App\Infrastructure\Eloquent\Models\InvoiceModel;
use App\Infrastructure\Zatca\UblXmlGenerator;
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
        \Illuminate\Support\Facades\DB::setDefaultConnection('tenant');

        $model = InvoiceModel::with('items.product')->find($this->invoiceId);
        if (!$model) return;

        // Convert to domain entity for the XML Generator
        $invoiceEntity = app(\App\Domain\Sales\Repositories\InvoiceRepositoryInterface::class)->findById($this->invoiceId);
        if (!$invoiceEntity) return;

        // Extract settings
        // Hardcoding standard defaults for Simulation Environment
        $sellerName = 'شركة تجريبية';
        $vatNumber = '300000000000003';
        
        $zatcaUuid = Str::uuid()->toString();
        $xml = UblXmlGenerator::generateInvoiceXml($invoiceEntity, $sellerName, $vatNumber, $zatcaUuid);
        
        // Hash the XML using SHA-256 and base64
        $xmlHash = base64_encode(hash('sha256', $xml, true));

        // Get CSID for auth
        $zatcaService = app(\App\Infrastructure\Zatca\ZatcaOnboardingService::class);
        $csidToken = $zatcaService->getTenantSetting('zatca_compliance_csid');
        $secret = $zatcaService->getTenantSetting('zatca_compliance_secret');

        // If no credentials, we can't report but we can still save the generated XML
        if (!$csidToken || !$secret) {
            $model->update([
                'zatca_xml' => $xml,
                'zatca_hash' => $xmlHash,
                'zatca_uuid' => $zatcaUuid,
                'zatca_status' => 'pending', // Awaiting onboarding
                'zatca_error_message' => 'Pending ZATCA onboarding. No CSID found.'
            ]);
            return;
        }

        // Execute Real HTTP POST to ZATCA Core APIs (Simulation Endpoint)
        $response = \Illuminate\Support\Facades\Http::withBasicAuth($csidToken, $secret)
            ->withHeaders([
                'Accept-Version' => 'V2',
                'Clearance-Status' => '1',
                'Accept-Language' => 'en',
            ])->post('https://gw-fatoora.zatca.gov.sa/e-invoicing/simulation/invoices/reporting/single', [
                'invoiceHash' => $xmlHash,
                'uuid' => $zatcaUuid,
                'invoice' => base64_encode($xml)
            ]);

        if ($response->successful() && isset($response['validationResults']['infoMessages'])) {
            $model->update([
                'zatca_xml' => $xml,
                'zatca_hash' => $xmlHash,
                'zatca_uuid' => $zatcaUuid,
                'zatca_status' => 'reported',
                'zatca_error_message' => null
            ]);
        } else {
            $model->update([
                'zatca_xml' => $xml,
                'zatca_hash' => $xmlHash,
                'zatca_uuid' => $zatcaUuid,
                'zatca_status' => 'failed',
                'zatca_error_message' => $response->body()
            ]);
        }
    }
}
