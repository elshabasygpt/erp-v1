<?php

declare(strict_types=1);

namespace App\Infrastructure\Zatca;

class ZatcaXmlSigner
{
    /**
     * Hash the XML content using SHA-256 and return base64
     */
    public function hashXml(string $xml): string
    {
        // Canonicalize XML before hashing (C14N)
        $doc = new \DOMDocument();
        $doc->loadXML($xml);
        $canonicalized = $doc->C14N(true, false);

        return base64_encode(hash('sha256', $canonicalized, true));
    }

    /**
     * Sign the XML hash using the tenant's private key (ECDSA secp256r1)
     */
    public function signXml(string $xmlHash, string $privateKeyPem): string
    {
        $privateKey = openssl_pkey_get_private($privateKeyPem);

        if (!$privateKey) {
            throw new \RuntimeException('Invalid private key for ZATCA signing');
        }

        $signature = '';
        $result = openssl_sign(
            base64_decode($xmlHash),
            $signature,
            $privateKey,
            OPENSSL_ALGO_SHA256
        );

        if (!$result) {
            throw new \RuntimeException('Failed to sign XML: ' . openssl_error_string());
        }

        return base64_encode($signature);
    }

    /**
     * Embed the digital signature into the XML
     */
    public function embedSignature(string $xml, string $signature, string $xmlHash, string $certificatePem): string
    {
        $doc = new \DOMDocument();
        $doc->loadXML($xml);

        $certificateBase64 = base64_encode($certificatePem);

        // Build the UBL Extension signature block
        $signatureBlock = <<<XML
<ext:UBLExtensions>
    <ext:UBLExtension>
        <ext:ExtensionURI>urn:oasis:names:specification:ubl:dsig:ext:CSEF</ext:ExtensionURI>
        <ext:ExtensionContent>
            <sig:UBLDocumentSignatures xmlns:sig="urn:oasis:names:specification:ubl:schema:xsd:CommonSignatureComponents-2">
                <sac:SignatureInformation xmlns:sac="urn:oasis:names:specification:ubl:schema:xsd:SignatureAggregateComponents-2">
                    <cbc:ID xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">urn:oasis:names:specification:ubl:signature:1</cbc:ID>
                    <sbc:DigitalSignatureAttachment xmlns:sbc="urn:oasis:names:specification:ubl:schema:xsd:SignatureBasicComponents-2">
                        <cac:ExternalReference xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2">
                            <cbc:URI xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">urn:oasis:names:specification:ubl:signature:Invoice</cbc:URI>
                        </cac:ExternalReference>
                    </sbc:DigitalSignatureAttachment>
                </sac:SignatureInformation>
            </sig:UBLDocumentSignatures>
        </ext:ExtensionContent>
    </ext:UBLExtension>
</ext:UBLExtensions>
<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="signature">
    <ds:SignedInfo>
        <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2006/12/xml-c14n11"/>
        <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha256"/>
        <ds:Reference Id="invoiceSignedData" URI="">
            <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
            <ds:DigestValue>{$xmlHash}</ds:DigestValue>
        </ds:Reference>
    </ds:SignedInfo>
    <ds:SignatureValue>{$signature}</ds:SignatureValue>
    <ds:KeyInfo>
        <ds:X509Data>
            <ds:X509Certificate>{$certificateBase64}</ds:X509Certificate>
        </ds:X509Data>
    </ds:KeyInfo>
</ds:Signature>
XML;

        // Insert before closing Invoice tag
        $xml = str_replace('</Invoice>', $signatureBlock . '</Invoice>', $xml);

        return $xml;
    }
}
