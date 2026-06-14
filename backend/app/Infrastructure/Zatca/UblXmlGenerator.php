<?php

declare(strict_types=1);

namespace App\Infrastructure\Zatca;

use App\Domain\Sales\Entities\Invoice;

class UblXmlGenerator
{
    /**
     * Generate UBL 2.1 standard XML for an invoice according to ZATCA rules.
     * 
     * @param Invoice $invoice
     * @param string $sellerName
     * @param string $vatNumber
     * @param string $uuid (Zatca specific Hash/UUID)
     * @return string
     */
    public static function generateInvoiceXml(
        Invoice $invoice,
        string $sellerName,
        string $vatNumber,
        string $uuid
    ): string {
        $issueDate = $invoice->getInvoiceDate()->format('Y-m-d');
        $issueTime = $invoice->getInvoiceDate()->format('H:i:s');
        $invoiceNumber = $invoice->getInvoiceNumber();
        $totalAmount = number_format($invoice->getTotal(), 2, '.', '');
        $taxAmount = number_format($invoice->getVatAmount(), 2, '.', '');
        $subtotal = number_format($invoice->getSubtotal() - $invoice->getDiscountAmount(), 2, '.', '');

        // Minimal required XML structure for ZATCA E-Invoicing Phase 2 Simulation
        $xml = <<<XML
<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
    xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
    xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
    xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
    <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
    <cbc:ID>{$invoiceNumber}</cbc:ID>
    <cbc:UUID>{$uuid}</cbc:UUID>
    <cbc:IssueDate>{$issueDate}</cbc:IssueDate>
    <cbc:IssueTime>{$issueTime}</cbc:IssueTime>
    <cbc:InvoiceTypeCode name="0111010">388</cbc:InvoiceTypeCode>
    <cbc:DocumentCurrencyCode>SAR</cbc:DocumentCurrencyCode>
    
    <cac:AccountingSupplierParty>
        <cac:Party>
            <cac:PartyIdentification>
                <cbc:ID schemeID="CRN">1234567890</cbc:ID>
            </cac:PartyIdentification>
            <cac:PartyName>
                <cbc:Name>{$sellerName}</cbc:Name>
            </cac:PartyName>
            <cac:PartyTaxScheme>
                <cbc:CompanyID>{$vatNumber}</cbc:CompanyID>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:PartyTaxScheme>
        </cac:Party>
    </cac:AccountingSupplierParty>
    
    <cac:LegalMonetaryTotal>
        <cbc:TaxExclusiveAmount currencyID="SAR">{$subtotal}</cbc:TaxExclusiveAmount>
        <cbc:TaxInclusiveAmount currencyID="SAR">{$totalAmount}</cbc:TaxInclusiveAmount>
        <cbc:PayableAmount currencyID="SAR">{$totalAmount}</cbc:PayableAmount>
    </cac:LegalMonetaryTotal>
    
    <cac:TaxTotal>
        <cbc:TaxAmount currencyID="SAR">{$taxAmount}</cbc:TaxAmount>
    </cac:TaxTotal>
XML;

        // Append line items
        $lineId = 1;
        foreach ($invoice->getItems() as $item) {
            $itemTotal = number_format($item->getTotal(), 2, '.', '');
            $itemQty = number_format($item->getQuantity(), 2, '.', '');
            $itemPrice = number_format($item->getUnitPrice(), 2, '.', '');
            $itemName = htmlspecialchars($item->getProductName() ?? 'Product');
            
            $xml .= <<<XML
    
    <cac:InvoiceLine>
        <cbc:ID>{$lineId}</cbc:ID>
        <cbc:InvoicedQuantity unitCode="EA">{$itemQty}</cbc:InvoicedQuantity>
        <cbc:LineExtensionAmount currencyID="SAR">{$itemTotal}</cbc:LineExtensionAmount>
        <cac:Item>
            <cbc:Name>{$itemName}</cbc:Name>
        </cac:Item>
        <cac:Price>
            <cbc:PriceAmount currencyID="SAR">{$itemPrice}</cbc:PriceAmount>
        </cac:Price>
    </cac:InvoiceLine>
XML;
            $lineId++;
        }

        $xml .= "\n</Invoice>";

        return $xml;
    }
}
