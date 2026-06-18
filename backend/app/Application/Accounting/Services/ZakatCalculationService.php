<?php

declare(strict_types=1);

namespace App\Application\Accounting\Services;

use App\Domain\Accounting\Entities\JournalEntry;
use App\Domain\Accounting\Entities\JournalEntryLine;
use App\Domain\Accounting\Repositories\JournalEntryRepositoryInterface;
use App\Domain\Accounting\Services\AccountMappingService;
use Illuminate\Support\Facades\DB;

final class ZakatCalculationService
{
    public function __construct(
        private JournalEntryRepositoryInterface $journalEntryRepository,
        private AccountMappingService $accountMappingService,
    ) {}

    public function calculateZakatBase(
        string $tenantId,
        \DateTimeImmutable $asOf,
        string $method = 'working_capital',
        array $assetAccountIds = [],
        array $liabilityAccountIds = [],
        array $equityAccountIds = [],
        array $longTermLiabilityAccountIds = [],
        array $fixedAssetAccountIds = [],
        array $provisionAccountIds = []
    ): array {
        $allAccountIds = array_unique(array_merge(
            $assetAccountIds, 
            $liabilityAccountIds, 
            $equityAccountIds, 
            $longTermLiabilityAccountIds, 
            $fixedAssetAccountIds, 
            $provisionAccountIds
        ));
        if (empty($allAccountIds)) {
            return [
                'as_of' => $asOf->format('Y-m-d'),
                'assets' => [],
                'liabilities' => [],
                'total_assets' => 0.0,
                'total_liabilities' => 0.0,
                'total_equity' => 0.0,
                'total_lt_liabilities' => 0.0,
                'total_provisions' => 0.0,
                'total_fixed_assets' => 0.0,
                'zakat_base' => 0.0,
            ];
        }

        // Fetch aggregated balances for the selected accounts up to the $asOf date
        $query = DB::connection('tenant')->table('journal_entry_lines')
            ->where('journal_entries.tenant_id', $tenantId)
            ->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
            ->join('accounts', 'journal_entry_lines.account_id', '=', 'accounts.id')
            ->where('journal_entries.is_posted', true)
            ->where('journal_entries.date', '<=', $asOf->format('Y-m-d'))
            ->whereIn('accounts.id', $allAccountIds)
            ->groupBy('accounts.id', 'accounts.code', 'accounts.name', 'accounts.name_ar', 'accounts.type')
            ->selectRaw('accounts.id, accounts.code, accounts.name, accounts.name_ar, accounts.type, SUM(journal_entry_lines.debit) as total_debit, SUM(journal_entry_lines.credit) as total_credit');

        $balances = $query->get();

        $assets = [];
        $liabilities = [];
        $equities = [];
        $ltLiabilities = [];
        $fixedAssets = [];
        $provisions = [];

        $totalAssets = 0.0;
        $totalLiabilities = 0.0;
        $totalEquity = 0.0;
        $totalLtLiabilities = 0.0;
        $totalFixedAssets = 0.0;
        $totalProvisions = 0.0;

        foreach ($balances as $account) {
            if (in_array($account->id, $assetAccountIds)) {
                // For assets, normal balance is Debit - Credit
                $balance = (float) $account->total_debit - (float) $account->total_credit;
                $assets[] = [
                    'id' => $account->id,
                    'code' => $account->code,
                    'name' => $account->name,
                    'name_ar' => $account->name_ar,
                    'balance' => $balance,
                ];
                $totalAssets += $balance;
            }

            if (in_array($account->id, $liabilityAccountIds)) {
                // For liabilities, normal balance is Credit - Debit
                $balance = (float) $account->total_credit - (float) $account->total_debit;
                $liabilities[] = [
                    'id' => $account->id,
                    'code' => $account->code,
                    'name' => $account->name,
                    'name_ar' => $account->name_ar,
                    'balance' => $balance,
                ];
                $totalLiabilities += $balance;
            }

            if (in_array($account->id, $equityAccountIds)) {
                $balance = (float) $account->total_credit - (float) $account->total_debit;
                $equities[] = [ 'id' => $account->id, 'code' => $account->code, 'name' => $account->name, 'name_ar' => $account->name_ar, 'balance' => $balance ];
                $totalEquity += $balance;
            }

            if (in_array($account->id, $longTermLiabilityAccountIds)) {
                $balance = (float) $account->total_credit - (float) $account->total_debit;
                $ltLiabilities[] = [ 'id' => $account->id, 'code' => $account->code, 'name' => $account->name, 'name_ar' => $account->name_ar, 'balance' => $balance ];
                $totalLtLiabilities += $balance;
            }

            if (in_array($account->id, $provisionAccountIds)) {
                $balance = (float) $account->total_credit - (float) $account->total_debit;
                $provisions[] = [ 'id' => $account->id, 'code' => $account->code, 'name' => $account->name, 'name_ar' => $account->name_ar, 'balance' => $balance ];
                $totalProvisions += $balance;
            }

            if (in_array($account->id, $fixedAssetAccountIds)) {
                $balance = (float) $account->total_debit - (float) $account->total_credit;
                $fixedAssets[] = [ 'id' => $account->id, 'code' => $account->code, 'name' => $account->name, 'name_ar' => $account->name_ar, 'balance' => $balance ];
                $totalFixedAssets += $balance;
            }
        }

        // It is possible an account was selected but has no transactions yet
        // We will just return what we have (0 balance for missing accounts is implied)

        if ($method === 'sources_of_funds') {
            $zakatBase = ($totalEquity + $totalLtLiabilities + $totalProvisions) - $totalFixedAssets;
        } else {
            $zakatBase = $totalAssets - $totalLiabilities;
        }

        return [
            'as_of' => $asOf->format('Y-m-d'),
            'method' => $method,
            'assets' => $assets,
            'liabilities' => $liabilities,
            'equities' => $equities,
            'lt_liabilities' => $ltLiabilities,
            'fixed_assets' => $fixedAssets,
            'provisions' => $provisions,
            'total_assets' => $totalAssets,
            'total_liabilities' => $totalLiabilities,
            'total_equity' => $totalEquity,
            'total_lt_liabilities' => $totalLtLiabilities,
            'total_fixed_assets' => $totalFixedAssets,
            'total_provisions' => $totalProvisions,
            'zakat_base' => $zakatBase,
        ];
    }

    public function postZakatEntry(
        string $tenantId,
        \DateTimeImmutable $date,
        float $zakatAmount,
        string $userId
    ): void {
        if ($zakatAmount <= 0) {
            throw new \DomainException('Zakat amount must be greater than zero to post an entry.');
        }

        $expenseAccountId = $this->accountMappingService->resolve('zakat_expense');
        $payableAccountId = $this->accountMappingService->resolve('zakat_payable');

        $entryNumber = $this->journalEntryRepository->getNextEntryNumber();

        $entry = new JournalEntry(
            id: null,
            entryNumber: $entryNumber,
            date: $date,
            description: 'Zakat Al-Mal Provision for ' . $date->format('Y'),
            isPosted: true,
            referenceType: 'zakat',
            referenceId: null,
            createdBy: $userId
        );

        $entry->addLine(new JournalEntryLine(
            id: null,
            journalEntryId: '',
            accountId: $expenseAccountId,
            debit: $zakatAmount,
            credit: 0.0,
            description: 'Zakat Expense'
        ));

        $entry->addLine(new JournalEntryLine(
            id: null,
            journalEntryId: '',
            accountId: $payableAccountId,
            debit: 0.0,
            credit: $zakatAmount,
            description: 'Zakat Payable Provision'
        ));

        $this->journalEntryRepository->create($entry);
    }

    public function payZakat(
        string $tenantId,
        \DateTimeImmutable $date,
        float $amount,
        string $safeAccountId,
        string $userId,
        string $referenceNumber = ''
    ): void {
        if ($amount <= 0) {
            throw new \DomainException('Amount must be greater than zero.');
        }

        $payableAccountId = $this->accountMappingService->resolve('zakat_payable');
        $entryNumber = $this->journalEntryRepository->getNextEntryNumber();

        $entry = new JournalEntry(
            id: null,
            entryNumber: $entryNumber,
            date: $date,
            description: 'Zakat Payment ' . ($referenceNumber ? "Ref: $referenceNumber" : ''),
            isPosted: true,
            referenceType: 'zakat_payment',
            referenceId: null,
            createdBy: $userId
        );

        // Debit: Zakat Payable (reducing liability)
        $entry->addLine(new JournalEntryLine(
            id: null,
            journalEntryId: '',
            accountId: $payableAccountId,
            debit: $amount,
            credit: 0.0,
            description: 'Zakat Payment Settlement'
        ));

        // Credit: Bank / Safe (reducing assets)
        $entry->addLine(new JournalEntryLine(
            id: null,
            journalEntryId: '',
            accountId: $safeAccountId,
            debit: 0.0,
            credit: $amount,
            description: 'Zakat Payment Outflow'
        ));

        $this->journalEntryRepository->create($entry);
    }
}
