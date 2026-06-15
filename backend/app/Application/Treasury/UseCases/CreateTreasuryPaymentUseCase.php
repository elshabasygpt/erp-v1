<?php

declare(strict_types=1);

namespace App\Application\Treasury\UseCases;

use App\Infrastructure\Eloquent\Models\SafeModel;
use App\Infrastructure\Eloquent\Models\SafeTransactionModel;
use App\Domain\Accounting\Repositories\JournalEntryRepositoryInterface;
use App\Domain\Accounting\Entities\JournalEntry;
use App\Domain\Accounting\Entities\JournalEntryLine;
use App\Domain\Accounting\Services\AccountMappingService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use DomainException;

final class CreateTreasuryPaymentUseCase
{
    public function __construct(
        private readonly JournalEntryRepositoryInterface $journalEntryRepository,
        private readonly AccountMappingService $accountMapping
    ) {}

    public function execute(string $tenantId, array $data, string $userId): SafeTransactionModel
    {
        return DB::connection('tenant')->transaction(function () use ($tenantId, $data, $userId) {
            $safeId = $data['safe_id'];
            $amount = (float) $data['amount'];
            $debitAccountId = $data['account_id']; // The account receiving the money (e.g. Expense, Asset)
            $date = $data['transaction_date'] ?? date('Y-m-d');
            $description = $data['description'] ?? 'Treasury Payment';

            if ($amount <= 0) {
                throw new DomainException("Amount must be greater than zero.");
            }

            $safe = SafeModel::where('tenant_id', $tenantId)->find($safeId);
            if (!$safe) {
                throw new DomainException("Safe not found.");
            }

            if ($safe->balance < $amount) {
                throw new DomainException("Insufficient funds in safe '{$safe->name}'.");
            }

            // Update Safe Balance
            $safe->balance -= $amount;
            $safe->save();

            // Create Transaction
            $transaction = SafeTransactionModel::create([
                'id' => Str::uuid()->toString(),
                'safe_id' => $safe->id,
                'type' => 'withdrawal',
                'amount' => $amount,
                'description' => $description,
                'reference_type' => 'treasury_payment',
                'reference_id' => null,
                'created_by' => $userId,
                'transaction_date' => $date,
                'cost_center_id' => $data['cost_center_id'] ?? null,
                'currency_id' => $data['currency_id'] ?? null,
                'exchange_rate' => $data['exchange_rate'] ?? 1.0,
            ]);

            // Create Journal Entry
            $entryNumber = $this->journalEntryRepository->getNextEntryNumber();
            $journalEntry = new JournalEntry(
                id: null,
                entryNumber: $entryNumber,
                date: new \DateTimeImmutable($date),
                description: $description,
                isPosted: true,
                referenceType: 'treasury_payment',
                referenceId: $transaction->id,
                createdBy: $userId,
                transactionCurrencyId: $data['currency_id'] ?? null,
                exchangeRate: $data['exchange_rate'] ?? 1.0,
            );

            // Debit: Provided Account
            $journalEntry->addLine(new JournalEntryLine(
                id: null,
                journalEntryId: '',
                accountId: $debitAccountId,
                debit: $amount,
                credit: 0,
                description: "Treasury Payment Destination",
                costCenterId: $data['cost_center_id'] ?? null,
            ));

            // Credit: Safe (Cash/Bank)
            $creditAccountKey = $safe->type === 'bank' ? 'bank' : 'cash';
            $journalEntry->addLine(new JournalEntryLine(
                id: null,
                journalEntryId: '',
                accountId: $this->accountMapping->resolve($creditAccountKey),
                debit: 0,
                credit: $amount,
                description: "Payment from {$safe->name}"
            ));

            $this->journalEntryRepository->create($journalEntry);

            return $transaction;
        });
    }
}
