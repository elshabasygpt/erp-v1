<?php

declare(strict_types=1);

namespace App\Application\Purchases\UseCases;

use App\Domain\Accounting\Entities\JournalEntry;
use App\Domain\Accounting\Entities\JournalEntryLine;
use App\Domain\Accounting\Repositories\JournalEntryRepositoryInterface;
use App\Domain\Accounting\Services\AccountMappingService;
use App\Domain\Accounting\Services\FiscalPeriodService;
use App\Domain\Inventory\Services\InventoryValuationService;
use App\Infrastructure\Eloquent\Models\PurchaseReturnModel;
use App\Infrastructure\Eloquent\Models\SupplierModel;
use Illuminate\Support\Facades\DB;

/**
 * ConfirmPurchaseReturnUseCase
 *
 * Handles confirmation of a purchase return:
 * 1. Removes the returned stock from the warehouse (with row locks)
 * 2. Reduces the supplier's balance (we owe them less / they owe us back)
 * 3. Creates the reversing double-entry journal entry
 */
final class ConfirmPurchaseReturnUseCase
{
    public function __construct(
        private AccountMappingService $accountMapping,
        private FiscalPeriodService $fiscalPeriodService,
        private JournalEntryRepositoryInterface $journalEntryRepository,
        private InventoryValuationService $inventoryValuationService,
    ) {}

    public function execute(string $purchaseReturnId, string $warehouseId, string $userId): void
    {
        $closure = function () use ($purchaseReturnId, $warehouseId, $userId) {
            $purchaseReturn = PurchaseReturnModel::query()->with('items')->lockForUpdate()->findOrFail($purchaseReturnId);

            if ($purchaseReturn->status === 'completed') {
                throw new \DomainException('Purchase return is already completed.');
            }

            // ── Stock removal with row locks ──
            foreach ($purchaseReturn->items as $item) {
                $this->inventoryValuationService->recordMovement(
                    $item->product_id,
                    $warehouseId,
                    -(float) $item->quantity,
                    (float) $item->unit_price,
                    'return',
                    $purchaseReturn->id,
                    $userId
                );
            }

            // ── Supplier balance (we owe them less) ──
            $totalAmount = (float) $purchaseReturn->total_amount;
            $supplier = SupplierModel::query()->lockForUpdate()->find($purchaseReturn->supplier_id);
            if ($supplier) {
                $supplier->balance -= $totalAmount;
                $supplier->save();
            }

            // ── Update status ──
            $purchaseReturn->update(['status' => 'completed']);

            // ── Validate fiscal period ──
            $this->fiscalPeriodService->validatePostingDate(new \DateTimeImmutable);

            // ── Journal Entry (reversal of the original purchase) ──
            $this->createJournalEntry($purchaseReturn, $userId);
        };

        if (app()->environment() === 'testing') {
            $closure();

            return;
        }

        DB::connection('tenant')->transaction($closure);
    }

    private function createJournalEntry(PurchaseReturnModel $purchaseReturn, string $userId): void
    {
        $entryNumber = $this->journalEntryRepository->getNextEntryNumber();

        $totalAmount = (float) $purchaseReturn->total_amount;
        $taxAmount = (float) $purchaseReturn->tax_amount;
        $subtotal = round($totalAmount - $taxAmount, 2);

        $journalEntry = new JournalEntry(
            id: null,
            entryNumber: $entryNumber,
            date: new \DateTimeImmutable,
            description: "Purchase Return: {$purchaseReturn->number}",
            transactionCurrencyId: null,
            exchangeRate: 1.0,
            isPosted: false,
            referenceType: 'purchase_return',
            referenceId: $purchaseReturn->id,
            createdBy: $userId,
        );

        // Debit: Accounts Payable (reduces what we owe the supplier)
        $journalEntry->addLine(new JournalEntryLine(
            id: null,
            journalEntryId: '',
            accountId: $this->accountMapping->resolve('ap'),
            debit: round($totalAmount, 2),
            credit: 0,
            transactionDebit: round($totalAmount, 2),
            transactionCredit: 0.0,
            description: 'Accounts Payable - Purchase return',
        ));

        // Credit: Inventory (reverses the inventory recognized on purchase)
        $journalEntry->addLine(new JournalEntryLine(
            id: null,
            journalEntryId: '',
            accountId: $this->accountMapping->resolve('inventory'),
            debit: 0,
            credit: $subtotal,
            transactionDebit: 0.0,
            transactionCredit: $subtotal,
            description: 'Inventory return',
        ));

        // Credit: Input VAT (reverses the input VAT recoverable on purchase)
        if ($taxAmount > 0) {
            $journalEntry->addLine(new JournalEntryLine(
                id: null,
                journalEntryId: '',
                accountId: $this->accountMapping->resolve('vat_input'),
                debit: 0,
                credit: round($taxAmount, 2),
                transactionDebit: 0.0,
                transactionCredit: round($taxAmount, 2),
                description: 'Input VAT reversal on purchase return',
            ));
        }

        $journalEntry->post();
        $this->journalEntryRepository->create($journalEntry);
    }
}
