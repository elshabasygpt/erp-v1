<?php

declare(strict_types=1);

namespace App\Infrastructure\Zatca;

class TlvEncoder
{
    /**
     * Encode ZATCA required tags into a Base64 string.
     *
     * @param string $sellerName Tag 1
     * @param string $vatNumber Tag 2
     * @param string $timestamp Tag 3 (e.g., 2022-04-25T15:30:00Z)
     * @param string $invoiceTotal Tag 4
     * @param string $vatTotal Tag 5
     * @return string
     */
    public static function encodeBase64(
        string $sellerName,
        string $vatNumber,
        string $timestamp,
        string $invoiceTotal,
        string $vatTotal
    ): string {
        $tlv = '';
        $tlv .= self::encodeTag(1, $sellerName);
        $tlv .= self::encodeTag(2, $vatNumber);
        $tlv .= self::encodeTag(3, $timestamp);
        $tlv .= self::encodeTag(4, $invoiceTotal);
        $tlv .= self::encodeTag(5, $vatTotal);

        return base64_encode($tlv);
    }

    /**
     * Encode a single tag to bytes (TLV format).
     *
     * @param int $tag
     * @param string $value
     * @return string
     */
    private static function encodeTag(int $tag, string $value): string
    {
        $valueBytes = $value; // value is treated as string bytes
        $length = strlen($valueBytes);

        // Pack format: 'C' = unsigned char (1 byte)
        return pack('C', $tag) . pack('C', $length) . $valueBytes;
    }
}
