<?php

declare(strict_types=1);

namespace App\Application\Treasury\UseCases;

use App\Application\Accounting\Services\ExchangeRateService;
use App\Domain\Accounting\Entities\JournalEntry;
use App\Domain\Accounting\Entities\JournalEntryLine;
use App\Domain\Accounting\Repositories\JournalEntryRepositoryInterface;
use App\Domain\Accounting\Services\AccountMappingService;
use App\Infrastructure\Eloquent\Models\SafeModel;
use App\Infrastructure\Eloquent\Models\SafeTransactionModel;
use DomainException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class TransferBetweenSafesUseCase
{
    public function __construct(
        private readonly JournalEntryRepositoryInterface $journalEntryRepository,
        private readonly AccountMappingService $accountMapping,
        private readonly ExchangeRateService $exchangeRateService
    ) {}

    public function execute(string $tenantId, string $fromId, string $toId, float $amount, string $userId, string $date, string $description = ''): void
    {
        DB::connection('tenant')->transaction(function () use ($tenantId, $fromId, $toId, $amount, $userId, $date, $description) {
            if ($amount <= 0) {
                throw new DomainException('Transfer amount must be positive.');
            }

            if ($fromId === $toId) {
                throw new DomainException('Source and destination safes must be different.');
            }

            $fromSafe = SafeModel::query()->where('tenant_id', $tenantId)->find($fromId);
            $toSafe = SafeModel::query()->where('tenant_id', $tenantId)->find($toId);

            if (! $fromSafe || ! $toSafe) {
                throw new DomainException('Source or destination safe not found.');
            }

            if ($fromSafe->balance < $amount) {
                throw new DomainException("Insufficient balance in source safe '{$fromSafe->name}'.");
            }

            // Cross-Currency Logic
            $fromCurrencyId = $fromSafe->currency_id;
            $toCurrencyId = $toSafe->currency_id;

            $fromRate = 1.0;
            $toRate = 1.0;

            if ($fromCurrencyId) {
                $fromRate = $this->exchangeRateService->getRate($tenantId, $fromCurrencyId, $date);
            }
            if ($toCurrencyId) {
                $toRate = $this->exchangeRateService->getRate($tenantId, $toCurrencyId, $date);
            }

            // The 'amount' is in the source safe's currency
            $baseEquivalent = round($amount * $fromRate, 2);
            $destinationAmount = round($toRate > 0 ? $baseEquivalent / $toRate : $amount, 2);

            // Update Balances
            $fromSafe->balance -= $amount;
            $fromSafe->save();

            $toSafe->balance += $destinationAmount;
            $toSafe->save();

            // Log Source Transaction
            SafeTransactionModel::query()->create([
                'id' => Str::uuid()->toString(),
                'safe_id' => $fromId,
                'type' => 'transfer_out',
                'amount' => $amount,
                'exchange_rate' => $fromRate,
                'description' => "Transfer to {$toSafe->name}".($description ? " - $description" : ''),
                'reference_type' => 'transfer',
                'reference_id' => $toId, // the other safe ID
                'created_by' => $userId,
                'transaction_date' => $date,
            ]);

            // Log Destination Transaction
            $destinationTx = SafeTransactionModel::query()->create([
                'id' => Str::uuid()->toString(),
                'safe_id' => $toId,
                'type' => 'transfer_in',
                'amount' => $destinationAmount,
                'exchange_rate' => $toRate,
                'description' => "Transfer from {$fromSafe->name}".($description ? " - $description" : ''),
                'reference_type' => 'transfer',
                'reference_id' => $fromId, // the other safe ID
                'created_by' => $userId,
                'transaction_date' => $date,
            ]);

            // Create Journal Entry
            $entryNumber = $this->journalEntryRepository->getNextEntryNumber();
            $journalEntry = new JournalEntry(
                id: null,
                entryNumber: $entryNumber,
                date: new \DateTimeImmutable($date),
                description: "Transfer from {$fromSafe->name} to {$toSafe->name}".($description ? " - $description" : ''),
                transactionCurrencyId: $fromCurrencyId,
                exchangeRate: $fromRate,
                isPosted: true,
                referenceType: 'safe_transfer',
                referenceId: $destinationTx->id,
                createdBy: $userId
            );

            // Accounts (Cash or Bank depending on the type of safe)
            $fromAccountKey = $fromSafe->type === 'bank' ? 'bank' : 'cash';
            $toAccountKey = $toSafe->type === 'bank' ? 'bank' : 'cash';

            // Debit: Destination Safe
            $journalEntry->addLine(new JournalEntryLine(
                id: null,
                journalEntryId: '',
                accountId: $this->accountMapping->resolve($toAccountKey),
                debit: $baseEquivalent,
                credit: 0,
                transactionDebit: $destinationAmount,
                transactionCredit: 0.0,
                description: "Transfer In to {$toSafe->name}",
            ));

            // Credit: Source Safe
            $journalEntry->addLine(new JournalEntryLine(
                id: null,
                journalEntryId: '',
                accountId: $this->accountMapping->resolve($fromAccountKey),
                debit: 0,
                credit: $baseEquivalent,
                transactionDebit: 0.0,
                transactionCredit: $amount,
                description: "Transfer Out from {$fromSafe->name}",
            ));

            $this->journalEntryRepository->create($journalEntry);
        });
    }
}
