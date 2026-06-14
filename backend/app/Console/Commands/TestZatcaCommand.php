<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Domain\Sales\Services\ZatcaPhase1Service;
use App\Infrastructure\Zatca\UblXmlGenerator;
use App\Domain\Sales\Entities\Invoice;
use App\Domain\Sales\Entities\InvoiceItem;
use Illuminate\Support\Str;

class TestZatcaCommand extends Command
{
    protected $signature = 'app:test-zatca';
    protected $description = 'Test ZATCA Phase 1 (QR) and Phase 2 (XML Hash)';

    public function handle(ZatcaPhase1Service $zatca1Service)
    {
        $this->info("🚀 Starting ZATCA System Test...");

        // 1. Create a dummy Invoice domain entity
        $invoice = new Invoice(
            id: Str::uuid()->toString(),
            invoiceNumber: 'INV-TEST-001',
            customerId: null,
            type: 'cash',
            subtotal: 1000.00,
            vatAmount: 150.00,
            discountAmount: 0.00,
            total: 1150.00,
            status: 'confirmed',
            invoiceDate: new \DateTimeImmutable()
        );

        $invoice->addItem(new InvoiceItem(
            id: Str::uuid()->toString(),
            invoiceId: $invoice->getId(),
            productId: Str::uuid()->toString(),
            quantity: 1,
            unitPrice: 1000.00,
            discountPercent: 0,
            vatRate: 15,
            productName: 'Computer Programming Services'
        ));

        // 2. Test Phase 1: TLV QR Code Generation
        $this->info("\n[Phase 1] Generaing TLV Base64 QR Code...");
        try {
            $qrCode = $zatca1Service->generateQrBase64(
                'Kimo Store Co',
                '310122393500003',
                $invoice->getInvoiceDate(),
                $invoice->getTotal(),
                $invoice->getVatAmount()
            );
            $this->info("✅ Phase 1 Success!");
            $this->line("QR Base64: " . $qrCode);
        } catch (\Exception $e) {
            $this->error("❌ Phase 1 Failed: " . $e->getMessage());
        }

        // 3. Test Phase 2: UBL XML & Hashing
        $this->info("\n[Phase 2] Generating UBL 2.1 XML and Hashing...");
        try {
            $zatcaUuid = Str::uuid()->toString();
            $xml = UblXmlGenerator::generateInvoiceXml(
                $invoice,
                'Kimo Store Co',
                '310122393500003',
                $zatcaUuid
            );
            
            $xmlHash = base64_encode(hash('sha256', $xml, true));
            $this->info("✅ Phase 2 Success!");
            $this->line("ZATCA UUID: " . $zatcaUuid);
            $this->line("XML SHA-256 Hash: " . $xmlHash);
            $this->line("XML Snippet:");
            $this->line(substr($xml, 0, 300) . "...\n</Invoice>");
        } catch (\Exception $e) {
            $this->error("❌ Phase 2 Failed: " . $e->getMessage());
        }

        $this->info("\n🎉 ZATCA Integration Test Completed!");
    }
}
