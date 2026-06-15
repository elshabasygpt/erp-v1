<?php

declare(strict_types=1);

namespace App\Domain\Accounting\Services;

use App\Domain\Accounting\Repositories\JournalEntryRepositoryInterface;
use App\Domain\Accounting\Entities\JournalEntry;
use App\Domain\Accounting\Entities\JournalEntryLine;
use App\Infrastructure\Eloquent\Models\CustomerModel;
use App\Infrastructure\Eloquent\Models\SupplierModel;
use App\Infrastructure\Eloquent\Models\WarehouseProductModel;
use App\Infrastructure\Eloquent\Models\SafeModel;
use Illuminate\Support\Facades\DB;
use DomainException;

/**
 * Handles the initialization of balances for a new tenant or system.
 */
final class OpeningBalanceService
{
    public function __construct(
        private readonly JournalEntryRepositoryInterface $journalEntryRepository,
        private readonly AccountMappingService $accountMapping
    ) {}

    public function setCustomerOpeningBalance(string $tenantId, string $customerId, float $amount, string $userId): void
    {
        DB::connection('tenant')->transaction(function () use ($tenantId, $customerId, $amount, $userId) {
            $customer = CustomerModel::where('tenant_id', $tenantId)->findOrFail($customerId);
            
            // Assuming customer balance field update if exists (if not, we rely purely on accounting)
            // But we should create the journal entry.
            $equityAccountId = $this->accountMapping->resolve('opening_balance_equity');
            $arAccountId = $this->accountMapping->resolve('ar');

            $entry = new JournalEntry(
                id: null,
                entryNumber: $this->journalEntryRepository->getNextEntryNumber(),
                date: new \DateTimeImmutable(),
                description: "Opening Balance for Customer: {$customer->name}",
                isPosted: true,
                referenceType: 'opening_balance',
                referenceId: $customerId,
                createdBy: $userId
            );

            if ($amount > 0) {
                // Customer owes us
                $entry->addLine(new JournalEntryLine(null, '', $arAccountId, $amount, 0, 'Opening Balance AR'));
                $entry->addLine(new JournalEntryLine(null, '', $equityAccountId, 0, $amount, 'Opening Balance Equity'));
            } elseif ($amount < 0) {
                // We owe customer
                $entry->addLine(new JournalEntryLine(null, '', $equityAccountId, abs($amount), 0, 'Opening Balance Equity'));
                $entry->addLine(new JournalEntryLine(null, '', $arAccountId, 0, abs($amount), 'Opening Balance AR'));
            }

            $this->journalEntryRepository->create($entry);
        });
    }

    public function setSupplierOpeningBalance(string $tenantId, string $supplierId, float $amount, string $userId): void
    {
        DB::connection('tenant')->transaction(function () use ($tenantId, $supplierId, $amount, $userId) {
            $supplier = SupplierModel::where('tenant_id', $tenantId)->findOrFail($supplierId);
            
            $equityAccountId = $this->accountMapping->resolve('opening_balance_equity');
            $apAccountId = $this->accountMapping->resolve('ap');

            $entry = new JournalEntry(
                id: null,
                entryNumber: $this->journalEntryRepository->getNextEntryNumber(),
                date: new \DateTimeImmutable(),
                description: "Opening Balance for Supplier: {$supplier->name}",
                isPosted: true,
                referenceType: 'opening_balance',
                referenceId: $supplierId,
                createdBy: $userId
            );

            if ($amount > 0) {
                // We owe supplier
                $entry->addLine(new JournalEntryLine(null, '', $equityAccountId, $amount, 0, 'Opening Balance Equity'));
                $entry->addLine(new JournalEntryLine(null, '', $apAccountId, 0, $amount, 'Opening Balance AP'));
            } elseif ($amount < 0) {
                // Supplier owes us (advance payment)
                $entry->addLine(new JournalEntryLine(null, '', $apAccountId, abs($amount), 0, 'Opening Balance AP'));
                $entry->addLine(new JournalEntryLine(null, '', $equityAccountId, 0, abs($amount), 'Opening Balance Equity'));
            }

            $this->journalEntryRepository->create($entry);
        });
    }

    public function setSafeOpeningBalance(string $tenantId, string $safeId, float $amount, string $userId): void
    {
        DB::connection('tenant')->transaction(function () use ($tenantId, $safeId, $amount, $userId) {
            $safe = SafeModel::where('tenant_id', $tenantId)->findOrFail($safeId);
            $safe->balance = $amount; // Assuming initial setup
            $safe->save();

            $equityAccountId = $this->accountMapping->resolve('opening_balance_equity');
            $safeAccountId = $this->accountMapping->resolve($safe->type === 'bank' ? 'bank' : 'cash');

            $entry = new JournalEntry(
                id: null,
                entryNumber: $this->journalEntryRepository->getNextEntryNumber(),
                date: new \DateTimeImmutable(),
                description: "Opening Balance for Safe: {$safe->name}",
                isPosted: true,
                referenceType: 'opening_balance',
                referenceId: $safeId,
                createdBy: $userId
            );

            $entry->addLine(new JournalEntryLine(null, '', $safeAccountId, $amount, 0, 'Opening Balance Cash/Bank'));
            $entry->addLine(new JournalEntryLine(null, '', $equityAccountId, 0, $amount, 'Opening Balance Equity'));

            $this->journalEntryRepository->create($entry);
        });
    }
}
