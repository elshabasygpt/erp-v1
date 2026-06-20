<?php

declare(strict_types=1);

namespace App\Domain\Accounting\Services;

use App\Domain\Accounting\Entities\JournalEntry;
use App\Domain\Accounting\Entities\JournalEntryLine;
use App\Domain\Accounting\Repositories\JournalEntryRepositoryInterface;
use Illuminate\Support\Facades\DB;
use Exception;

class YearEndClosingService
{
    public function __construct(
        private readonly AccountMappingService $accountMappingService,
        private readonly JournalEntryRepositoryInterface $journalEntryRepo
    ) {}

    public function generateClosingEntry(string $tenantId, string $periodId, string $userId): void
    {
        // 1. Fetch Fiscal Period
        $period = DB::connection('tenant')->table('fiscal_periods')
            ->where('tenant_id', $tenantId)
            ->where('id', $periodId)
            ->first();

        if (!$period) {
            throw new Exception("Fiscal period not found.");
        }

        // 2. Fetch all Revenue and Expense Accounts
        $plAccounts = DB::connection('tenant')->table('accounts')
            ->where('tenant_id', $tenantId)
            ->whereIn('type', ['revenue', 'expense'])
            ->get();

        if ($plAccounts->isEmpty()) {
            return; // No P&L accounts to close
        }

        // 3. Resolve Retained Earnings Account
        $retainedEarningsAccountId = $this->accountMappingService->resolve('retained_earnings');
        if (!$retainedEarningsAccountId) {
            throw new Exception("Retained Earnings account mapping not found. Cannot close fiscal year.");
        }

        $lines = [];
        $totalRetainedEarnings = '0.000000';

        // 4. Calculate balances
        foreach ($plAccounts as $account) {
            // Get balance for this account within the period
            $balance = (float) DB::connection('tenant')->table('journal_entry_lines')
                ->join('journal_entries', 'journal_entries.id', '=', 'journal_entry_lines.journal_entry_id')
                ->where('journal_entries.tenant_id', $tenantId)
                ->where('journal_entry_lines.account_id', $account->id)
                ->whereBetween('journal_entries.date', [$period->start_date, $period->end_date])
                ->where('journal_entries.is_posted', true)
                ->select(DB::raw('COALESCE(SUM(debit) - SUM(credit), 0) as net'))
                ->value('net');

            $balance = round($balance, 6);

            if ($balance == 0) {
                continue;
            }

            // If balance is positive (Debit balance), we need to Credit it to zero it out
            // If balance is negative (Credit balance), we need to Debit it to zero it out

            $debit = 0.0;
            $credit = 0.0;

            if ($balance > 0) {
                $credit = abs($balance);
                // Retained earnings will be debited (Loss)
                $totalRetainedEarnings = bcsub($totalRetainedEarnings, sprintf('%.6F', $credit), 6);
            } else {
                $debit = abs($balance);
                // Retained earnings will be credited (Gain)
                $totalRetainedEarnings = bcadd($totalRetainedEarnings, sprintf('%.6F', $debit), 6);
            }

            $lines[] = new JournalEntryLine(
                id: null,
                journalEntryId: '',
                accountId: $account->id,
                debit: $debit,
                credit: $credit,
                transactionDebit: 0.0,
                transactionCredit: 0.0,
                description: 'Year-End Closing Entry'
            );
        }

        if (empty($lines)) {
            return; // Nothing to close
        }

        // 5. Add Retained Earnings Line
        $reDebit = 0.0;
        $reCredit = 0.0;
        
        $totalREFloat = (float) $totalRetainedEarnings;
        
        if ($totalREFloat > 0) {
            $reCredit = abs($totalREFloat); // Net Income
        } elseif ($totalREFloat < 0) {
            $reDebit = abs($totalREFloat);  // Net Loss
        }

        if ($reDebit > 0 || $reCredit > 0) {
            $lines[] = new JournalEntryLine(
                id: null,
                journalEntryId: '',
                accountId: $retainedEarningsAccountId,
                debit: $reDebit,
                credit: $reCredit,
                transactionDebit: 0.0,
                transactionCredit: 0.0,
                description: 'Year-End Retained Earnings Transfer'
            );
        }

        // 6. Generate Journal Entry
        $je = new JournalEntry(
            id: null,
            entryNumber: 'YEC-' . $periodId,
            date: new \DateTimeImmutable($period->end_date),
            description: "Fiscal Year Closing for period {$period->name}",
            isPosted: false,
            referenceType: 'fiscal_year_close',
            referenceId: $periodId,
            createdBy: $userId
        );

        foreach ($lines as $line) {
            $je->addLine($line);
        }

        $je->post();
        $this->journalEntryRepo->create($je);
    }
}
