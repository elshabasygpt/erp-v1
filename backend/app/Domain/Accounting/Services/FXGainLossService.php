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
        $fxDifference = round($fxDifference, 6);

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

    /**
     * Calculate Unrealized FX Gains/Losses for month-end revaluation.
     * Idempotent: reverses any existing revaluation for the same period before recreating.
     * @return int Number of journal entries created
     */
    public function calculateUnrealizedGainsLosses(string $tenantId, string $date): int
    {
        $periodMonth = date('Y-m', strtotime($date)); // e.g. "2025-06"

        // Reverse any existing unrealized revaluation entries for this period to ensure idempotency
        $existingIds = \DB::connection('tenant')->table('journal_entries')
            ->where('tenant_id', $tenantId)
            ->where('reference_type', 'fx_revaluation')
            ->whereRaw("DATE_FORMAT(date, '%Y-%m') = ?", [$periodMonth])
            ->pluck('id');

        if ($existingIds->isNotEmpty()) {
            \DB::connection('tenant')->table('journal_entry_lines')
                ->whereIn('journal_entry_id', $existingIds)
                ->delete();
            \DB::connection('tenant')->table('journal_entries')
                ->whereIn('id', $existingIds)
                ->delete();

            // Also remove the auto-reversal entries for next month that were pre-created
            $nextMonth = date('Y-m', strtotime($date . ' +1 month'));
            $reversalIds = \DB::connection('tenant')->table('journal_entries')
                ->where('tenant_id', $tenantId)
                ->where('reference_type', 'fx_reversal')
                ->whereRaw("DATE_FORMAT(date, '%Y-%m') = ?", [$nextMonth])
                ->pluck('id');

            if ($reversalIds->isNotEmpty()) {
                \DB::connection('tenant')->table('journal_entry_lines')
                    ->whereIn('journal_entry_id', $reversalIds)
                    ->delete();
                \DB::connection('tenant')->table('journal_entries')
                    ->whereIn('id', $reversalIds)
                    ->delete();
            }
        }

        $entriesCreated = 0;

        // Get latest exchange rates as of the given date for all foreign currencies
        $rates = \DB::connection('tenant')->table('exchange_rates')
            ->where('tenant_id', $tenantId)
            ->where('date', '<=', $date)
            ->orderBy('date', 'desc')
            ->get()
            ->unique('currency_id')
            ->keyBy('currency_id');

        if ($rates->isEmpty()) {
            return 0;
        }

        $fxAccount = $this->accountMapping->resolve('unrealized_fx_gain_loss');
        $arAccount = $this->accountMapping->resolve('ar');
        $apAccount = $this->accountMapping->resolve('ap');

        // Process AR (Sales Invoices)
        $invoices = \DB::connection('tenant')->table('invoices')
            ->where('tenant_id', $tenantId)
            ->whereNotNull('currency_id')
            ->where('invoice_date', '<=', $date)
            ->where('payment_status', '!=', 'paid')
            ->get();

        foreach ($invoices as $inv) {
            if (!isset($rates[$inv->currency_id])) continue;

            $eomRate = (float) $rates[$inv->currency_id]->rate;
            $invRate = (float) $inv->exchange_rate;
            if ($eomRate === $invRate) continue;

            $openForeign     = (float) $inv->total - (float) $inv->paid_amount;
            $historicalLocal = round($openForeign * $invRate, 6);
            $currentLocal    = round($openForeign * $eomRate, 6);
            $variance        = round($currentLocal - $historicalLocal, 6);
            if ($variance == 0) continue;

            $this->createRevaluationEntry($tenantId, $date, $variance, $arAccount, $fxAccount, 'ar', $inv->id);
            $entriesCreated++;
        }

        // Process AP (Purchase Invoices)
        $purchases = \DB::connection('tenant')->table('purchase_invoices')
            ->where('tenant_id', $tenantId)
            ->whereNotNull('currency_id')
            ->where('invoice_date', '<=', $date)
            ->where('payment_status', '!=', 'paid')
            ->get();

        foreach ($purchases as $pur) {
            if (!isset($rates[$pur->currency_id])) continue;

            $eomRate = (float) $rates[$pur->currency_id]->rate;
            $purRate = (float) $pur->exchange_rate;
            if ($eomRate === $purRate) continue;

            $openForeign     = (float) $pur->total - (float) $pur->paid_amount;
            $historicalLocal = round($openForeign * $purRate, 6);
            $currentLocal    = round($openForeign * $eomRate, 6);
            $variance        = round($currentLocal - $historicalLocal, 6);
            if ($variance == 0) continue;

            $this->createRevaluationEntry($tenantId, $date, $variance, $apAccount, $fxAccount, 'ap', $pur->id);
            $entriesCreated++;
        }

        return $entriesCreated;
    }

    private function createRevaluationEntry(string $tenantId, string $date, float $variance, string $baseAccount, string $fxAccount, string $type, string $refId): void
    {
        $isGain = false;
        if ($type === 'ar') {
            $isGain = $variance > 0;
        } else { // ap
            $isGain = $variance < 0;
        }

        $absVar = abs($variance);

        $je = new \App\Domain\Accounting\Entities\JournalEntry(
            id: null,
            entryNumber: 'FXR-' . time() . rand(10,99),
            date: new \DateTimeImmutable($date),
            description: "Unrealized FX Revaluation for $type $refId",
            isPosted: false,
            referenceType: 'fx_revaluation',
            referenceId: $refId,
            createdBy: 'system'
        );

        if ($type === 'ar') {
            if ($isGain) {
                // Dr AR, Cr Unrealized FX Gain
                $je->addLine($this->createLine($baseAccount, $absVar, 0.0));
                $je->addLine($this->createLine($fxAccount, 0.0, $absVar));
            } else {
                // Dr Unrealized FX Loss, Cr AR
                $je->addLine($this->createLine($fxAccount, $absVar, 0.0));
                $je->addLine($this->createLine($baseAccount, 0.0, $absVar));
            }
        } else { // ap
            if ($isGain) {
                // Dr AP, Cr Unrealized FX Gain
                $je->addLine($this->createLine($baseAccount, $absVar, 0.0));
                $je->addLine($this->createLine($fxAccount, 0.0, $absVar));
            } else {
                // Dr Unrealized FX Loss, Cr AP
                $je->addLine($this->createLine($fxAccount, $absVar, 0.0));
                $je->addLine($this->createLine($baseAccount, 0.0, $absVar));
            }
        }

        $je->post();
        
        $repo = app(\App\Domain\Accounting\Repositories\JournalEntryRepositoryInterface::class);
        $repo->create($je);

        // --- Auto Reversal for 1st day of next month ---
        $reversalDate = (new \DateTimeImmutable($date))->modify('first day of next month')->format('Y-m-d');
        
        $jeRev = new \App\Domain\Accounting\Entities\JournalEntry(
            id: null,
            entryNumber: 'FXREV-' . time() . rand(10,99),
            date: new \DateTimeImmutable($reversalDate),
            description: "Auto-Reversal: Unrealized FX Revaluation for $type $refId",
            isPosted: false,
            referenceType: 'fx_reversal',
            referenceId: $refId,
            createdBy: 'system'
        );

        if ($type === 'ar') {
            if ($isGain) {
                $jeRev->addLine($this->createLine($baseAccount, 0.0, $absVar));
                $jeRev->addLine($this->createLine($fxAccount, $absVar, 0.0));
            } else {
                $jeRev->addLine($this->createLine($fxAccount, 0.0, $absVar));
                $jeRev->addLine($this->createLine($baseAccount, $absVar, 0.0));
            }
        } else { // ap
            if ($isGain) {
                $jeRev->addLine($this->createLine($baseAccount, 0.0, $absVar));
                $jeRev->addLine($this->createLine($fxAccount, $absVar, 0.0));
            } else {
                $jeRev->addLine($this->createLine($fxAccount, 0.0, $absVar));
                $jeRev->addLine($this->createLine($baseAccount, $absVar, 0.0));
            }
        }

        $jeRev->post();
        $repo->create($jeRev);
    }

    private function createLine(string $account, float $debit, float $credit): JournalEntryLine
    {
        return new JournalEntryLine(
            id: null,
            journalEntryId: '',
            accountId: $account,
            debit: $debit,
            credit: $credit,
            transactionDebit: 0.0,
            transactionCredit: 0.0,
            description: ''
        );
    }
}
