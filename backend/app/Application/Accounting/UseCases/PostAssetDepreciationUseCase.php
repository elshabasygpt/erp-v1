<?php

declare(strict_types=1);

namespace App\Application\Accounting\UseCases;

use App\Domain\Accounting\Entities\JournalEntry;
use App\Domain\Accounting\Entities\JournalEntryLine;
use App\Domain\Accounting\Repositories\JournalEntryRepositoryInterface;
use App\Domain\Accounting\Services\AccountMappingService;
use App\Domain\Accounting\Services\FiscalPeriodService;
use App\Infrastructure\Eloquent\Models\FixedAssetDepreciationEntryModel;
use App\Infrastructure\Eloquent\Models\FixedAssetModel;
use Illuminate\Support\Facades\DB;

final class PostAssetDepreciationUseCase
{
    public function __construct(
        private JournalEntryRepositoryInterface $journalEntryRepository,
        private AccountMappingService $accountMapping,
        private FiscalPeriodService $fiscalPeriodService,
    ) {}

    /**
     * Post the depreciation charge owed for this asset as of $asOf.
     * Returns null if there is nothing to post (already up to date, or fully depreciated).
     */
    public function execute(FixedAssetModel $asset, \DateTimeImmutable $asOf, ?string $userId = null): ?FixedAssetDepreciationEntryModel
    {
        if ($asset->status !== 'active') {
            throw new \DomainException('Asset is not active.');
        }

        $depreciableAmount  = (float) $asset->purchase_cost - (float) $asset->salvage_value;
        $usefulLifeYears    = (int) $asset->useful_life_years;
        $totalLifeMonths    = $usefulLifeYears * 12;
        $currentAccumulated = (float) $asset->accumulated_depreciation;
        $currentBookValue   = (float) $asset->purchase_cost - $currentAccumulated;

        $purchaseDate  = new \DateTimeImmutable($asset->purchase_date->format('Y-m-d'));
        $diff          = $asOf->diff($purchaseDate);
        $monthsElapsed = min($diff->y * 12 + $diff->m, $totalLifeMonths);

        $method    = $asset->depreciation_method ?? 'straight_line';
        $totalOwed = match ($method) {
            // (Cost − Salvage) / Life in months × months elapsed
            'straight_line' => $depreciableAmount / $totalLifeMonths * $monthsElapsed,

            // Double Declining Balance: 2/Life × current book value (no salvage floor in rate, but never below salvage)
            'declining_balance' => $this->calcDecliningBalance(
                (float) $asset->purchase_cost,
                (float) $asset->salvage_value,
                $totalLifeMonths,
                $monthsElapsed
            ),

            // Sum-of-Years-Digits
            'sum_of_years_digits' => $this->calcSumOfYearsDigits(
                $depreciableAmount,
                $totalLifeMonths,
                $monthsElapsed
            ),

            default => $depreciableAmount / $totalLifeMonths * $monthsElapsed,
        };

        $totalOwed  = round(min($totalOwed, $depreciableAmount), 6);
        $incremental = round($totalOwed - $currentAccumulated, 6);

        if ($incremental <= 0) {
            return null;
        }

        $this->fiscalPeriodService->validatePostingDate($asOf);

        $lastEntry = FixedAssetDepreciationEntryModel::query()
            ->where('fixed_asset_id', $asset->id)
            ->orderByDesc('period_end')
            ->first();
        $periodStart = $lastEntry
            ? $lastEntry->period_end->copy()->addDay()->format('Y-m-d')
            : $asset->purchase_date->format('Y-m-d');

        return DB::connection('tenant')->transaction(function () use ($asset, $asOf, $userId, $incremental, $periodStart) {
            $journalEntry = $this->buildJournalEntry($asset, $asOf, $userId, $incremental);
            $journalEntry->post();
            $this->journalEntryRepository->create($journalEntry);

            $newAccumulated = round((float) $asset->accumulated_depreciation + $incremental, 6);
            $newBookValue = round((float) $asset->purchase_cost - $newAccumulated, 6);

            $asset->update([
                'accumulated_depreciation' => $newAccumulated,
                'current_value' => $newBookValue,
            ]);

            return FixedAssetDepreciationEntryModel::query()->create([
                'fixed_asset_id' => $asset->id,
                'journal_entry_id' => $journalEntry->getId(),
                'period_start' => $periodStart instanceof \DateTimeImmutable ? $periodStart->format('Y-m-d') : $periodStart,
                'period_end' => $asOf->format('Y-m-d'),
                'amount' => $incremental,
                'accumulated_after' => $newAccumulated,
                'book_value_after' => $newBookValue,
                'created_by' => $userId,
            ]);
        });
    }

    /**
     * Double Declining Balance: cumulative depreciation after N months.
     * Rate = 2 / life_months per month applied to remaining book value each month.
     * Book value never drops below salvage value.
     */
    private function calcDecliningBalance(float $cost, float $salvage, int $totalMonths, int $monthsElapsed): float
    {
        $monthlyRate  = 2 / $totalMonths;
        $bookValue    = $cost;
        $accumulated  = 0.0;

        for ($i = 0; $i < $monthsElapsed; $i++) {
            $charge     = $bookValue * $monthlyRate;
            $remaining  = $bookValue - $charge;
            if ($remaining < $salvage) {
                $charge = max(0, $bookValue - $salvage);
            }
            $accumulated += $charge;
            $bookValue   -= $charge;
            if ($bookValue <= $salvage) {
                break;
            }
        }

        return $accumulated;
    }

    /**
     * Sum-of-Years-Digits: cumulative depreciation after N months.
     * SYD_total = total_months * (total_months + 1) / 2
     * Each month fraction = remaining_months / SYD_total
     */
    private function calcSumOfYearsDigits(float $depreciable, int $totalMonths, int $monthsElapsed): float
    {
        $syd         = $totalMonths * ($totalMonths + 1) / 2;
        $accumulated = 0.0;

        for ($i = 0; $i < $monthsElapsed; $i++) {
            $remaining    = $totalMonths - $i;
            $accumulated += ($remaining / $syd) * $depreciable;
        }

        return $accumulated;
    }

    private function buildJournalEntry(FixedAssetModel $asset, \DateTimeImmutable $asOf, ?string $userId, float $amount): JournalEntry
    {
        $expenseAccountId = $asset->expense_account_id ?? $this->accountMapping->resolve('depreciation_expense');
        $accumulatedAccountId = $asset->depreciation_account_id ?? $this->accountMapping->resolve('accumulated_depreciation');

        $journalEntry = new JournalEntry(
            id: null,
            entryNumber: $this->journalEntryRepository->getNextEntryNumber(),
            date: $asOf,
            description: "Depreciation: {$asset->name}",
            referenceType: 'fixed_asset',
            referenceId: $asset->id,
            createdBy: $userId,
        );

        $journalEntry->addLine(new JournalEntryLine(
            id: null,
            journalEntryId: '',
            accountId: $expenseAccountId,
            debit: $amount,
            credit: 0,
            transactionDebit: $amount,
            transactionCredit: 0.0,
            description: "Depreciation expense - {$asset->name}",
        ));

        $journalEntry->addLine(new JournalEntryLine(
            id: null,
            journalEntryId: '',
            accountId: $accumulatedAccountId,
            debit: 0,
            credit: $amount,
            transactionDebit: 0.0,
            transactionCredit: $amount,
            description: "Accumulated depreciation - {$asset->name}",
        ));

        return $journalEntry;
    }
}
