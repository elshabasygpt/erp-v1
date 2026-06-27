<?php

declare(strict_types=1);

namespace App\Domain\Accounting\Services;

use App\Infrastructure\Eloquent\Models\Accounting\BankAccountModel;
use App\Infrastructure\Eloquent\Models\Accounting\BankTransactionModel;
use App\Infrastructure\Eloquent\Models\Accounting\ReconciliationLineModel;
use App\Infrastructure\Eloquent\Models\Accounting\ReconciliationModel;
use App\Infrastructure\Eloquent\Models\JournalEntryLineModel;
use DomainException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * BankReconciliationService
 *
 * Handles logic for Bank Accounts, Bank Transactions, and Bank Reconciliations.
 */
class BankReconciliationService
{
    /**
     * Create a new bank account.
     */
    public function createBankAccount(array $data, string $userId): BankAccountModel
    {
        $data['id'] = Str::uuid()->toString();
        $data['created_by'] = $userId;
        $data['tenant_id'] = app()->has('current_tenant') ? app('current_tenant')->id : null;
        if (!isset($data['current_balance'])) {
            $data['current_balance'] = $data['opening_balance'] ?? 0;
        }

        return BankAccountModel::query()->create($data);
    }

    /**
     * Import bank transactions from a statement (simplified).
     */
    public function importBankTransactions(string $bankAccountId, array $transactionsData, string $userId): array
    {
        $imported = [];
        DB::connection('tenant')->transaction(function () use ($bankAccountId, $transactionsData, $userId, &$imported) {
            $bankAccount = BankAccountModel::query()->findOrFail($bankAccountId);

            foreach ($transactionsData as $data) {
                // Ensure date format is correct
                $date = date('Y-m-d', strtotime($data['transaction_date']));

                $transaction = BankTransactionModel::query()->create([
                    'id' => Str::uuid()->toString(),
                    'bank_account_id' => $bankAccount->id,
                    'transaction_date' => $date,
                    'type' => $data['type'],
                    'amount' => $data['amount'],
                    'description' => $data['description'] ?? null,
                    'reference_number' => $data['reference_number'] ?? null,
                    'is_reconciled' => false,
                    'created_by' => $userId,
                ]);

                // Update current balance
                if (in_array($data['type'], ['deposit', 'interest'])) {
                    $bankAccount->current_balance += $data['amount'];
                } else {
                    $bankAccount->current_balance -= $data['amount'];
                }

                $imported[] = $transaction;
            }

            $bankAccount->save();
        });

        return $imported;
    }

    /**
     * Start a new bank reconciliation.
     */
    public function startReconciliation(string $bankAccountId, string $startDate, string $endDate, float $statementBalance, string $userId): ReconciliationModel
    {
        return DB::connection('tenant')->transaction(function () use ($bankAccountId, $startDate, $endDate, $statementBalance, $userId) {
            $bankAccount = BankAccountModel::query()->findOrFail($bankAccountId);

            // Calculate system balance from GL (simplification for now)
            // Ideally, we would sum the debits/credits of the linked chart_of_account_id
            $systemBalance = $bankAccount->current_balance;

            $reconciliation = ReconciliationModel::query()->create([
                'id' => Str::uuid()->toString(),
                'bank_account_id' => $bankAccountId,
                'statement_date' => $endDate, // Usually end date is statement date
                'start_date' => $startDate,
                'end_date' => $endDate,
                'statement_balance' => $statementBalance,
                'system_balance' => $systemBalance,
                'difference' => $statementBalance - $systemBalance,
                'status' => 'draft',
                'created_by' => $userId,
            ]);

            return $reconciliation;
        });
    }

    /**
     * Match a bank transaction to a journal entry line.
     */
    public function matchTransaction(string $reconciliationId, string $bankTransactionId, string $journalEntryLineId): ReconciliationLineModel
    {
        return DB::connection('tenant')->transaction(function () use ($reconciliationId, $bankTransactionId, $journalEntryLineId) {
            $reconciliation = ReconciliationModel::query()->findOrFail($reconciliationId);

            if ($reconciliation->status !== 'draft') {
                throw new DomainException('Cannot match transactions on a completed reconciliation.');
            }

            $bankTransaction = BankTransactionModel::query()->findOrFail($bankTransactionId);
            $journalEntryLine = JournalEntryLineModel::query()->findOrFail($journalEntryLineId);

            // Validation logic could go here (e.g., amounts match, dates are close)

            $line = ReconciliationLineModel::query()->create([
                'id' => Str::uuid()->toString(),
                'reconciliation_id' => $reconciliationId,
                'bank_transaction_id' => $bankTransactionId,
                'journal_entry_line_id' => $journalEntryLineId,
                'status' => 'matched',
            ]);

            // Update bank transaction
            $bankTransaction->update([
                'is_reconciled' => true,
                'reconciliation_id' => $reconciliationId,
                'journal_entry_id' => $journalEntryLine->journal_entry_id,
            ]);

            return $line;
        });
    }

    /**
     * Auto-match bank transactions to journal entry lines by amount + date proximity.
     * Returns ['matched' => int, 'lines' => ReconciliationLineModel[]]
     */
    public function autoMatch(string $reconciliationId, int $dateToleanceDays = 5): array
    {
        $reconciliation = ReconciliationModel::query()
            ->with('bankAccount')
            ->findOrFail($reconciliationId);

        if ($reconciliation->status !== 'draft') {
            throw new DomainException('Cannot auto-match a completed reconciliation.');
        }

        $bankAccountId = $reconciliation->bank_account_id;
        $chartAccountId = $reconciliation->bankAccount->chart_of_account_id ?? null;

        // Unreconciled bank transactions in the reconciliation window
        $bankTxns = BankTransactionModel::query()
            ->where('bank_account_id', $bankAccountId)
            ->where('is_reconciled', false)
            ->whereBetween('transaction_date', [$reconciliation->start_date, $reconciliation->end_date])
            ->orderBy('transaction_date')
            ->get();

        if ($bankTxns->isEmpty()) {
            return ['matched' => 0, 'lines' => []];
        }

        // Unmatched journal entry lines for this bank's GL account
        $matchedLineIds = ReconciliationLineModel::query()
            ->where('reconciliation_id', $reconciliationId)
            ->pluck('journal_entry_line_id')
            ->toArray();

        $glLines = JournalEntryLineModel::query()
            ->join('journal_entries', 'journal_entries.id', '=', 'journal_entry_lines.journal_entry_id')
            ->where('journal_entry_lines.account_id', $chartAccountId)
            ->where('journal_entries.is_posted', 1)
            ->whereBetween('journal_entries.date', [
                date('Y-m-d', strtotime($reconciliation->start_date . " -{$dateToleanceDays} days")),
                date('Y-m-d', strtotime($reconciliation->end_date   . " +{$dateToleanceDays} days")),
            ])
            ->when(! empty($matchedLineIds), fn($q) => $q->whereNotIn('journal_entry_lines.id', $matchedLineIds))
            ->select(
                'journal_entry_lines.id',
                'journal_entry_lines.debit',
                'journal_entry_lines.credit',
                'journal_entry_lines.description',
                'journal_entries.date',
                'journal_entries.entry_number',
            )
            ->get();

        $created  = [];
        $usedGlIds = [];

        return DB::connection('tenant')->transaction(function () use ($bankTxns, $glLines, $reconciliationId, &$created, &$usedGlIds) {
            foreach ($bankTxns as $txn) {
                $txnAmount = (float) $txn->amount;
                $txnDate   = strtotime($txn->transaction_date);
                $best      = null;
                $bestScore = PHP_INT_MAX;

                foreach ($glLines as $gl) {
                    if (in_array($gl->id, $usedGlIds)) {
                        continue;
                    }

                    // Deposits match debit side; withdrawals/fees match credit side
                    $glAmount = in_array($txn->type, ['deposit', 'interest'])
                        ? (float) $gl->debit
                        : (float) $gl->credit;

                    if (abs($glAmount - $txnAmount) > 0.01) {
                        continue;
                    }

                    $daysDiff = abs((int) (($txnDate - strtotime($gl->date)) / 86400));
                    if ($daysDiff < $bestScore) {
                        $bestScore = $daysDiff;
                        $best      = $gl;
                    }
                }

                if ($best === null) {
                    continue;
                }

                $line = ReconciliationLineModel::query()->create([
                    'id'                   => Str::uuid()->toString(),
                    'reconciliation_id'    => $reconciliationId,
                    'bank_transaction_id'  => $txn->id,
                    'journal_entry_line_id'=> $best->id,
                    'status'               => 'matched',
                ]);

                $txn->update([
                    'is_reconciled'    => true,
                    'reconciliation_id'=> $reconciliationId,
                ]);

                $usedGlIds[] = $best->id;
                $created[]   = $line;
            }

            return ['matched' => count($created), 'lines' => $created];
        });
    }

    /**
     * Complete a bank reconciliation.
     */
    public function completeReconciliation(string $reconciliationId, string $userId, bool $forceComplete = false): ReconciliationModel
    {
        return DB::connection('tenant')->transaction(function () use ($reconciliationId, $userId, $forceComplete) {
            $reconciliation = ReconciliationModel::query()->lockForUpdate()->findOrFail($reconciliationId);

            if ($reconciliation->status === 'completed') {
                throw new DomainException('Reconciliation is already completed.');
            }

            // Recalculate actual difference from matched bank transactions
            $matchedBankTotal = BankTransactionModel::query()
                ->where('reconciliation_id', $reconciliationId)
                ->where('is_reconciled', true)
                ->selectRaw("SUM(CASE WHEN type IN ('deposit','interest') THEN amount ELSE -amount END) as net")
                ->value('net') ?? 0;

            $unmatchedBankTotal = BankTransactionModel::query()
                ->where('bank_account_id', $reconciliation->bank_account_id)
                ->where('is_reconciled', false)
                ->whereBetween('transaction_date', [$reconciliation->start_date, $reconciliation->end_date])
                ->selectRaw("SUM(CASE WHEN type IN ('deposit','interest') THEN amount ELSE -amount END) as net")
                ->value('net') ?? 0;

            $actualDifference = round(
                (float) $reconciliation->statement_balance - (float) $reconciliation->system_balance,
                2
            );

            if (!$forceComplete && abs($actualDifference) > 0.01) {
                throw new DomainException(
                    "Cannot complete reconciliation: difference of {$actualDifference} remains. " .
                    'Ensure all transactions are matched or use force_complete to override.'
                );
            }

            $reconciliation->update([
                'status'         => 'completed',
                'difference'     => $actualDifference,
                'completed_by'   => $userId,
                'completed_at'   => now(),
            ]);

            return $reconciliation;
        });
    }
}
