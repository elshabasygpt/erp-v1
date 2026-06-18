<?php

declare(strict_types=1);

namespace App\Application\Expenses\UseCases;

use App\Domain\Accounting\Entities\JournalEntry;
use App\Domain\Accounting\Entities\JournalEntryLine;
use App\Domain\Accounting\Repositories\JournalEntryRepositoryInterface;
use App\Domain\Accounting\Services\AccountMappingService;
use App\Infrastructure\Eloquent\Models\ExpenseModel;
use App\Infrastructure\Eloquent\Models\SafeTransactionModel;
use DomainException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class ApproveExpenseVoucherUseCase
{
    public function __construct(
        private readonly JournalEntryRepositoryInterface $journalEntryRepository,
        private readonly AccountMappingService $accountMapping
    ) {}

    public function execute(string $tenantId, string $expenseId, string $userId): ExpenseModel
    {
        return DB::connection('tenant')->transaction(function () use ($tenantId, $expenseId, $userId) {
            $expense = ExpenseModel::query()->where('tenant_id', $tenantId)->with(['category', 'safe'])->find($expenseId);

            if (! $expense) {
                throw new DomainException('Expense voucher not found.');
            }

            if ($expense->status !== 'draft') {
                throw new DomainException('Only draft expense vouchers can be approved.');
            }

            if (! $expense->category->account_id) {
                throw new DomainException("Expense category '{$expense->category->name}' is not mapped to a general ledger account.");
            }

            // Update Safe Balance
            $safe = $expense->safe;
            if (! $safe) {
                throw new DomainException('Safe not found for this expense.');
            }

            if ($safe->balance < $expense->amount) {
                throw new DomainException("Insufficient funds in safe '{$safe->name}'.");
            }

            $safe->balance -= $expense->amount;
            $safe->save();

            SafeTransactionModel::query()->create([
                'id' => Str::uuid()->toString(),
                'safe_id' => $safe->id,
                'type' => 'withdrawal',
                'amount' => $expense->amount,
                'description' => "Expense payment: {$expense->voucher_number}",
                'reference_type' => 'expense',
                'reference_id' => $expense->id,
                'created_by' => $userId,
                'transaction_date' => now(),
            ]);

            // Create Journal Entry
            $entryNumber = $this->journalEntryRepository->getNextEntryNumber();
            $journalEntry = new JournalEntry(
                id: null,
                entryNumber: $entryNumber,
                date: new \DateTimeImmutable,
                description: "Expense Voucher: {$expense->voucher_number}",
                isPosted: true,
                referenceType: 'expense',
                referenceId: $expense->id,
                createdBy: $userId
            );

            // Debit: Expense Category Account
            $journalEntry->addLine(new JournalEntryLine(
                id: null,
                journalEntryId: '',
                accountId: $expense->category->account_id,
                debit: (float) $expense->amount,
                credit: 0,
                description: $expense->description ?? "Expense: {$expense->category->name}"
            ));

            // Credit: Cash or Bank
            $creditAccountKey = $safe->type === 'bank' ? 'bank' : 'cash';
            $journalEntry->addLine(new JournalEntryLine(
                id: null,
                journalEntryId: '',
                accountId: $this->accountMapping->resolve($creditAccountKey),
                debit: 0,
                credit: (float) $expense->amount,
                description: "Payment from {$safe->name}"
            ));

            $this->journalEntryRepository->create($journalEntry);

            $expense->status = 'approved';
            $expense->approved_by = $userId;
            $expense->save();

            return $expense;
        });
    }
}
