<?php

declare(strict_types=1);

namespace App\Application\Purchases\UseCases;

use App\Domain\Accounting\Entities\JournalEntry;
use App\Domain\Accounting\Entities\JournalEntryLine;
use App\Domain\Accounting\Repositories\JournalEntryRepositoryInterface;
use App\Domain\Accounting\Services\AccountMappingService;
use App\Infrastructure\Eloquent\Models\SafeModel;
use App\Infrastructure\Eloquent\Models\SafeTransactionModel;
use App\Infrastructure\Eloquent\Models\SupplierPaymentModel;
use DomainException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class ProcessSupplierRefundUseCase
{
    public function __construct(
        private readonly JournalEntryRepositoryInterface $journalEntryRepository,
        private readonly AccountMappingService $accountMapping
    ) {}

    public function execute(string $tenantId, array $data, string $userId): SupplierPaymentModel
    {
        return DB::connection('tenant')->transaction(function () use ($tenantId, $data, $userId) {
            $safeId = $data['safe_id'];
            $supplierId = $data['supplier_id'];
            $amount = (float) $data['amount'];
            $date = $data['date'] ?? date('Y-m-d');

            $safe = SafeModel::query()->where('tenant_id', $tenantId)->find($safeId);
            if (! $safe) {
                throw new DomainException('Safe not found.');
            }

            // Create Refund Record (Negative Payment or specific type if exists, but we use SupplierPaymentModel)
            $paymentId = Str::uuid()->toString();
            $payment = SupplierPaymentModel::query()->create([
                'id' => $paymentId,
                'tenant_id' => $tenantId,
                'supplier_id' => $supplierId,
                'amount' => -$amount, // Negative implies refund to us
                'payment_date' => $date,
                'reference_number' => $data['reference_number'] ?? null,
                'notes' => $data['notes'] ?? 'Supplier Refund',
            ]);

            // Update Safe Balance (Money comes back to us)
            $safe->balance += $amount;
            $safe->save();

            SafeTransactionModel::query()->create([
                'id' => Str::uuid()->toString(),
                'safe_id' => $safe->id,
                'type' => 'deposit',
                'amount' => $amount,
                'description' => 'Refund from supplier',
                'reference_type' => 'supplier_refund',
                'reference_id' => $payment->id,
                'created_by' => $userId,
                'transaction_date' => $date,
            ]);

            // Create Journal Entry
            $entryNumber = $this->journalEntryRepository->getNextEntryNumber();
            $journalEntry = new JournalEntry(
                id: null,
                entryNumber: $entryNumber,
                date: new \DateTimeImmutable($date),
                description: 'Supplier Refund',
                isPosted: true,
                referenceType: 'supplier_refund',
                referenceId: $payment->id,
                createdBy: $userId
            );

            // Debit: Cash or Bank
            $debitAccountKey = $safe->type === 'bank' ? 'bank' : 'cash';
            $journalEntry->addLine(new JournalEntryLine(
                id: null,
                journalEntryId: '',
                accountId: $this->accountMapping->resolve($debitAccountKey),
                debit: $amount,
                credit: 0,
                description: "Refund to {$safe->name}"
            ));

            // Credit: Accounts Payable
            $journalEntry->addLine(new JournalEntryLine(
                id: null,
                journalEntryId: '',
                accountId: $this->accountMapping->resolve('ap'),
                debit: 0,
                credit: $amount,
                description: 'Supplier Refund'
            ));

            $this->journalEntryRepository->create($journalEntry);

            return $payment;
        });
    }
}
