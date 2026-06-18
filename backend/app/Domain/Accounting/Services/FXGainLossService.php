<?php

declare(strict_types=1);

namespace App\Domain\Accounting\Services;

use App\Domain\Accounting\Entities\JournalEntryLine;

/**
 * FXGainLossService
 *
 * Handles Realized FX Gain/Loss calculations and generates corresponding journal entry lines
 * in accordance with IFRS standards.
 */
class FXGainLossService
{
    public function __construct(
        private readonly AccountMappingService $accountMapping
    ) {}

    /**
     * Calculate Realized FX Gain/Loss and generate journal entry lines.
     *
     * @param  float  $invoiceRate  The historical exchange rate of the invoice.
     * @param  float  $paymentRate  The current exchange rate at the time of payment.
     * @param  float  $foreignAmount  The amount being settled in foreign currency.
     * @param  string  $type  'ar' for Accounts Receivable, 'ap' for Accounts Payable.
     * @return array{fx_lines: JournalEntryLine[], fx_amount: float}
     */
    public function calculateAndGenerateLines(
        float $invoiceRate,
        float $paymentRate,
        float $foreignAmount,
        string $type
    ): array {
        $fxDifference = ($paymentRate - $invoiceRate) * $foreignAmount;
        $fxDifference = round($fxDifference, 2);

        $lines = [];

        if ($fxDifference != 0.0) {
            $fxAccount = $this->accountMapping->resolve('fx_gain_loss');

            // Determine if it's a gain or loss based on account type
            $isGain = false;
            if ($type === 'ar') {
                // If AR, higher payment rate means we received more local currency -> Gain
                $isGain = $fxDifference > 0;
            } elseif ($type === 'ap') {
                // If AP, higher payment rate means we paid more local currency -> Loss
                $isGain = $fxDifference < 0;
            }

            $absoluteFxAmount = abs($fxDifference);

            if ($isGain) {
                // Gain (Credit)
                $lines[] = new JournalEntryLine(
                    id: null,
                    journalEntryId: '',
                    accountId: $fxAccount,
                    debit: 0,
                    credit: $absoluteFxAmount,
                    transactionDebit: 0.0,
                    transactionCredit: 0.0,
                    description: 'Realized FX Gain'
                );
            } else {
                // Loss (Debit)
                $lines[] = new JournalEntryLine(
                    id: null,
                    journalEntryId: '',
                    accountId: $fxAccount,
                    debit: $absoluteFxAmount,
                    credit: 0,
                    transactionDebit: 0.0,
                    transactionCredit: 0.0,
                    description: 'Realized FX Loss'
                );
            }
        }

        return [
            'fx_lines' => $lines,
            'fx_amount' => $fxDifference, // Signed amount relative to payment rate difference
        ];
    }
}
