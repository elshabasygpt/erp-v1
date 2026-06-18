<?php

declare(strict_types=1);

namespace App\Domain\Sales\Services;

use App\Infrastructure\Zatca\TlvEncoder;
use Carbon\Carbon;

class ZatcaPhase1Service
{
    /**
     * Generate the ZATCA Phase 1 base64 string for an invoice.
     *
     * @param  \DateTimeInterface|string  $timestamp
     */
    public function generateQrBase64(
        string $sellerName,
        string $vatNumber,
        $timestamp,
        float $totalAmount,
        float $vatAmount
    ): string {
        if ($timestamp instanceof \DateTimeInterface) {
            $timestampString = Carbon::instance($timestamp)->toIso8601ZuluString();
        } else {
            $timestampString = Carbon::parse($timestamp)->toIso8601ZuluString();
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
