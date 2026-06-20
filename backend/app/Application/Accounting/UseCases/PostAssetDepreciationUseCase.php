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

        $depreciableAmount = (float) $asset->purchase_cost - (float) $asset->salvage_value;
        $usefulLifeYears = (int) $asset->useful_life_years;

        $purchaseDate = new \DateTimeImmutable($asset->purchase_date->format('Y-m-d'));
        $diff = $asOf->diff($purchaseDate);
        $monthsElapsed = min($diff->y * 12 + $diff->m, $usefulLifeYears * 12);

        $monthlyDepreciation = $depreciableAmount / ($usefulLifeYears * 12);
        $totalOwed = round($monthlyDepreciation * $monthsElapsed, 2);

        $currentAccumulated = (float) $asset->accumulated_depreciation;
        $incremental = round($totalOwed - $currentAccumulated, 2);

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

            $newAccumulated = round((float) $asset->accumulated_depreciation + $incremental, 2);
            $newBookValue = round((float) $asset->purchase_cost - $newAccumulated, 2);

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
