<?php

declare(strict_types=1);

namespace App\Application\Accounting\Services;

use App\Domain\Accounting\Repositories\AccountRepositoryInterface;
use App\Domain\Accounting\Repositories\JournalEntryRepositoryInterface;
use Illuminate\Support\Facades\DB;

final class AccountingService
{
    public function __construct(
        private AccountRepositoryInterface $accountRepository,
        private JournalEntryRepositoryInterface $journalEntryRepository,
    ) {}

    public function generateIncomeStatement(\DateTimeImmutable $from, \DateTimeImmutable $to, string $tenantId, ?string $fiscalPeriodId = null, ?string $costCenterId = null): array
    {
        // Instead of fetching all ledger lines, we fetch aggregated balances.
        // We can use a modified trial balance query that accepts date ranges.
        $balances = $this->getAggregatedBalances($from, $to, $tenantId, $fiscalPeriodId, $costCenterId);

        $revenues = [];
        $expenses = [];
        $totalRevenue = 0;
        $totalExpenses = 0;

        foreach ($balances as $account) {
            if ($account->type === 'revenue') {
                // Revenue normal balance is Credit
                $balance = $account->total_credit - $account->total_debit;
                $revenues[] = ['account' => (array) $account, 'balance' => $balance];
                $totalRevenue += $balance;
            } elseif ($account->type === 'expense') {
                // Expense normal balance is Debit
                $balance = $account->total_debit - $account->total_credit;
                $expenses[] = ['account' => (array) $account, 'balance' => $balance];
                $totalExpenses += $balance;
            }
        }

        return [
            'period' => ['from' => $from->format('Y-m-d'), 'to' => $to->format('Y-m-d')],
            'revenues' => $revenues,
            'expenses' => $expenses,
            'total_revenue' => $totalRevenue,
            'total_expenses' => $totalExpenses,
            'net_income' => $totalRevenue - $totalExpenses,
        ];
    }

    public function generateBalanceSheet(\DateTimeImmutable $asOf, string $tenantId, ?string $fiscalPeriodId = null, ?string $costCenterId = null): array
    {
        $balances = $this->getAggregatedBalances(new \DateTimeImmutable('1970-01-01'), $asOf, $tenantId, $fiscalPeriodId, $costCenterId);

        $assetItems = [];
        $liabilityItems = [];
        $equityItems = [];
        $totalAssets = 0;
        $totalLiabilities = 0;
        $totalEquity = 0;

        foreach ($balances as $account) {
            if ($account->type === 'asset') {
                $balance = $account->total_debit - $account->total_credit;
                $assetItems[] = ['account' => (array) $account, 'balance' => $balance];
                $totalAssets += $balance;
            } elseif ($account->type === 'liability') {
                $balance = $account->total_credit - $account->total_debit;
                $liabilityItems[] = ['account' => (array) $account, 'balance' => $balance];
                $totalLiabilities += $balance;
            } elseif ($account->type === 'equity') {
                $balance = $account->total_credit - $account->total_debit;
                $equityItems[] = ['account' => (array) $account, 'balance' => $balance];
                $totalEquity += $balance;
            }
        }

        // Net income for current year must be added to retained earnings (equity)
        // For simplicity, we just return the raw equity balances + current net income, or assume closing entries are done.
        // If the balance sheet doesn't balance, it's because current year net income isn't in equity yet.
        $netIncome = $totalAssets - ($totalLiabilities + $totalEquity);
        if ($netIncome !== 0.0) {
            $equityItems[] = [
                'account' => ['name' => 'Current Year Earnings', 'type' => 'equity'],
                'balance' => $netIncome,
            ];
            $totalEquity += $netIncome;
        }

        return [
            'as_of' => $asOf->format('Y-m-d'),
            'assets' => ['items' => $assetItems, 'total' => $totalAssets],
            'liabilities' => ['items' => $liabilityItems, 'total' => $totalLiabilities],
            'equity' => ['items' => $equityItems, 'total' => $totalEquity],
            'total_liabilities_and_equity' => $totalLiabilities + $totalEquity,
        ];
    }

    private function getAggregatedBalances(\DateTimeImmutable $from, \DateTimeImmutable $to, string $tenantId, ?string $fiscalPeriodId = null, ?string $costCenterId = null): array
    {
        $query = DB::connection('tenant')->table('journal_entry_lines')
            ->where('journal_entries.tenant_id', $tenantId)
            ->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
            ->join('accounts', 'journal_entry_lines.account_id', '=', 'accounts.id')
            ->where('journal_entries.is_posted', true)
            ->whereBetween('journal_entries.date', [$from->format('Y-m-d'), $to->format('Y-m-d')])
            ->when($fiscalPeriodId, fn($q) => $q->where('journal_entries.fiscal_period_id', $fiscalPeriodId))
            ->groupBy('accounts.id', 'accounts.code', 'accounts.name', 'accounts.name_ar', 'accounts.type')
            ->selectRaw('accounts.id, accounts.code, accounts.name, accounts.name_ar, accounts.type, SUM(journal_entry_lines.debit) as total_debit, SUM(journal_entry_lines.credit) as total_credit');

        if ($costCenterId) {
            $query->where('journal_entry_lines.cost_center_id', $costCenterId);
        }

        return $query->orderBy('accounts.code')->get()->toArray();
    }
}
