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
     * Complete a bank reconciliation.
     */
    public function completeReconciliation(string $reconciliationId, string $userId): ReconciliationModel
    {
        return DB::connection('tenant')->transaction(function () use ($reconciliationId, $userId) {
            $reconciliation = ReconciliationModel::query()->lockForUpdate()->findOrFail($reconciliationId);

            if ($reconciliation->status === 'completed') {
                throw new DomainException('Reconciliation is already completed.');
            }

            // Check if difference is zero (or within tolerance)
            // We'll recalculate the difference based on matched lines here in a real implementation
            // For now, let's assume it's valid to complete if they requested it.

            $reconciliation->update([
                'status' => 'completed',
                'completed_by' => $userId,
                'completed_at' => now(),
            ]);

            return $reconciliation;
        });
    }
}
