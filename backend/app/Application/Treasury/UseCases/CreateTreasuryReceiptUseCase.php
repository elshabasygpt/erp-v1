<?php

declare(strict_types=1);

namespace App\Application\Treasury\UseCases;

use App\Domain\Accounting\Entities\JournalEntry;
use App\Domain\Accounting\Entities\JournalEntryLine;
use App\Domain\Accounting\Repositories\JournalEntryRepositoryInterface;
use App\Domain\Accounting\Services\AccountMappingService;
use App\Infrastructure\Eloquent\Models\SafeModel;
use App\Infrastructure\Eloquent\Models\SafeTransactionModel;
use DomainException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class CreateTreasuryReceiptUseCase
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
            $creditAccountId = $data['account_id']; // The account providing the money
            $date = $data['transaction_date'] ?? date('Y-m-d');
            $description = $data['description'] ?? 'Treasury Receipt';

            if ($amount <= 0) {
                throw new DomainException('Amount must be greater than zero.');
            }

            $safe = SafeModel::query()->where('tenant_id', $tenantId)->find($safeId);
            if (! $safe) {
                throw new DomainException('Safe not found.');
            }

            // Update Safe Balance
            $safe->balance += $amount;
            $safe->save();

            // Create Transaction
            $transaction = SafeTransactionModel::query()->create([
                'id' => Str::uuid()->toString(),
                'safe_id' => $safe->id,
                'type' => 'deposit',
                'amount' => $amount,
                'description' => $description,
                'reference_type' => 'treasury_receipt',
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
                referenceType: 'treasury_receipt',
                referenceId: $transaction->id,
                createdBy: $userId,
                transactionCurrencyId: $data['currency_id'] ?? null,
                exchangeRate: $data['exchange_rate'] ?? 1.0,
            );

            // Debit: Safe (Cash/Bank)
            $debitAccountId = null;
            if ($safe->bank_account_id && $safe->bankAccount) {
                $debitAccountId = $safe->bankAccount->chart_of_account_id;
            }
            $debitAccountKey = $debitAccountId ?? $safe->account_id ?? $this->accountMapping->resolve($safe->type === 'bank' ? 'bank' : 'cash');

            $journalEntry->addLine(new JournalEntryLine(
                id: null,
                journalEntryId: '',
                accountId: $debitAccountKey,
                debit: $amount,
                credit: 0,
                description: "Receipt to {$safe->name}"
            ));

            // Credit: Provided Account
            $journalEntry->addLine(new JournalEntryLine(
                id: null,
                journalEntryId: '',
                accountId: $creditAccountId,
                debit: 0,
                credit: $amount,
                description: 'Treasury Receipt Source',
                costCenterId: $data['cost_center_id'] ?? null,
            ));

            $this->journalEntryRepository->create($journalEntry);

            return $transaction;
        });
    }
}
