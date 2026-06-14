<?php

declare(strict_types=1);

namespace App\Domain\Sales\Services;

use App\Infrastructure\Zatca\TlvEncoder;

class ZatcaPhase1Service
{
    /**
     * Generate the ZATCA Phase 1 base64 string for an invoice.
     *
     * @param string $sellerName
     * @param string $vatNumber
     * @param \DateTimeInterface|string $timestamp
     * @param float $totalAmount
     * @param float $vatAmount
     * @return string
     */
    public function generateQrBase64(
        string $sellerName,
        string $vatNumber,
        $timestamp,
        float $totalAmount,
        float $vatAmount
    ): string {
        if ($timestamp instanceof \DateTimeInterface) {
            $timestampString = \Carbon\Carbon::instance($timestamp)->toIso8601ZuluString();
        } else {
            $timestampString = \Carbon\Carbon::parse($timestamp)->toIso8601ZuluString();
        }
            
        return TlvEncoder::encodeBase64(
            $sellerName,
            $vatNumber,
            $timestampString,
            number_format($totalAmount, 2, '.', ''),
            number_format($vatAmount, 2, '.', '')
        );
    }
}
