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

    public function execute(string $tenantId, string $fromId, string $toId, float $amount, float $feeAmount, string $userId, string $date, string $description = ''): void
    {
        DB::connection('tenant')->transaction(function () use ($tenantId, $fromId, $toId, $amount, $feeAmount, $userId, $date, $description) {
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

            if ($fromSafe->balance < ($amount + $feeAmount)) {
                throw new DomainException("Insufficient balance in source safe '{$fromSafe->name}' to cover transfer and fees.");
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
            $fromSafe->balance -= ($amount + $feeAmount);
            $fromSafe->save();

            $toSafe->balance += $destinationAmount;
            $toSafe->save();

            // Log Source Transaction
            SafeTransactionModel::query()->create([
                'tenant_id' => $tenantId,
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
                'tenant_id' => $tenantId,
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

            // Log Fee Transaction if applicable
            $feeTxId = null;
            if ($feeAmount > 0) {
                $feeTx = SafeTransactionModel::query()->create([
                    'tenant_id' => $tenantId,
                    'id' => Str::uuid()->toString(),
                    'safe_id' => $fromId,
                    'type' => 'expense',
                    'amount' => $feeAmount,
                    'exchange_rate' => $fromRate,
                    'description' => "Transfer fees to {$toSafe->name}".($description ? " - $description" : ''),
                    'reference_type' => 'transfer_fee',
                    'reference_id' => $destinationTx->id,
                    'created_by' => $userId,
                    'transaction_date' => $date,
                ]);
                $feeTxId = $feeTx->id;
            }

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

            // Accounts (Cash, Bank or Wallet depending on the type of safe)
            $fromAccountId = null;
            if ($fromSafe->bank_account_id && $fromSafe->bankAccount) {
                $fromAccountId = $fromSafe->bankAccount->chart_of_account_id;
            }
            $fromAccountKey = $fromAccountId ?? $fromSafe->account_id ?? $this->accountMapping->resolve($fromSafe->type === 'bank' ? 'bank' : 'cash');

            $toAccountId = null;
            if ($toSafe->bank_account_id && $toSafe->bankAccount) {
                $toAccountId = $toSafe->bankAccount->chart_of_account_id;
            }
            $toAccountKey = $toAccountId ?? $toSafe->account_id ?? $this->accountMapping->resolve($toSafe->type === 'bank' ? 'bank' : 'cash');

            // Debit: Destination Safe
            $journalEntry->addLine(new JournalEntryLine(
                id: null,
                journalEntryId: '',
                accountId: $toAccountKey,
                debit: $baseEquivalent,
                credit: 0,
                transactionDebit: $destinationAmount,
                transactionCredit: 0.0,
                description: "Transfer In to {$toSafe->name}",
            ));

            $feeEquivalent = 0.0;
            if ($feeAmount > 0) {
                $feeEquivalent = round($feeAmount * $fromRate, 2);
                try {
                    $feeAccountId = $this->accountMapping->resolve('bank_fees');
                } catch (\Exception $e) {
                    // Fallback to general expense or fx loss if bank_fees not set up yet
                    try {
                        $feeAccountId = $this->accountMapping->resolve('fx_gain_loss');
                    } catch (\Exception $e2) {
                        $feeAccountId = $this->accountMapping->resolve('cash');
                    }
                }
                
                $journalEntry->addLine(new JournalEntryLine(
                    id: null,
                    journalEntryId: '',
                    accountId: $feeAccountId,
                    debit: $feeEquivalent,
                    credit: 0,
                    transactionDebit: $feeAmount,
                    transactionCredit: 0.0,
                    description: "Transfer Fees to {$toSafe->name}",
                ));
            }

            // Credit: Source Safe
            $journalEntry->addLine(new JournalEntryLine(
                id: null,
                journalEntryId: '',
                accountId: $fromAccountKey,
                debit: 0,
                credit: $baseEquivalent + $feeEquivalent,
                transactionDebit: 0.0,
                transactionCredit: $amount + $feeAmount,
                description: "Transfer Out from {$fromSafe->name}" . ($feeAmount > 0 ? ' (incl. fees)' : ''),
            ));

            $this->journalEntryRepository->create($journalEntry);
        });
    }
}
