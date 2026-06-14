<?php

declare(strict_types=1);

namespace App\Application\Purchases\UseCases;

use App\Infrastructure\Eloquent\Models\PurchaseInvoiceModel;
use App\Infrastructure\Eloquent\Models\WarehouseProductModel;
use App\Infrastructure\Eloquent\Models\StockMovementModel;
use App\Infrastructure\Eloquent\Models\SupplierModel;
use App\Domain\Accounting\Services\AccountMappingService;
use App\Domain\Accounting\Services\FiscalPeriodService;
use App\Domain\Accounting\Repositories\JournalEntryRepositoryInterface;
use App\Domain\Accounting\Entities\JournalEntry;
use App\Domain\Accounting\Entities\JournalEntryLine;
use App\Domain\Inventory\Services\StockLotService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * ConfirmPurchaseUseCase
 *
 * Handles the confirmation of a purchase invoice:
 * 1. Adds stock to warehouse (with row locks)
 * 2. Creates stock movements
 * 3. Updates supplier balance (credit purchases)
 * 4. Creates double-entry journal entries
 */
final class ConfirmPurchaseUseCase
{
    public function __construct(
        private AccountMappingService $accountMapping,
        private FiscalPeriodService $fiscalPeriodService,
        private JournalEntryRepositoryInterface $journalEntryRepository,
        private StockLotService $stockLotService,
    ) {}

    public function execute(string $purchaseId, string $paymentType, string $userId): void
    {
        DB::connection('tenant')->transaction(function () use ($purchaseId, $paymentType, $userId) {
            $purchase = PurchaseInvoiceModel::with('items')->lockForUpdate()->findOrFail($purchaseId);

            if ($purchase->status === 'confirmed') {
                throw new \DomainException('Purchase invoice is already confirmed.');
            }

            $paidAmount = $paymentType === 'cash' ? $purchase->total : 0;

            // ── Stock addition with row locks ──
            foreach ($purchase->items as $item) {
                $wp = WarehouseProductModel::lockForUpdate()->firstOrCreate(
                    ['warehouse_id' => $purchase->warehouse_id, 'product_id' => $item->product_id],
                    ['id' => Str::uuid()->toString(), 'quantity' => 0, 'average_cost' => 0]
                );

                // Calculate weighted average cost
                $totalOldValue = $wp->quantity * $wp->average_cost;
                $totalNewValue = $item->quantity * $item->unit_price;
                $newTotalQty = $wp->quantity + $item->quantity;
                $wp->average_cost = $newTotalQty > 0 ? round(($totalOldValue + $totalNewValue) / $newTotalQty, 4) : 0;
                $wp->quantity += $item->quantity;
                $wp->save();

                StockMovementModel::create([
                    'id' => Str::uuid()->toString(),
                    'product_id' => $item->product_id,
                    'warehouse_id' => $purchase->warehouse_id,
                    'type' => 'in',
                    'quantity' => $item->quantity,
                    'cost_per_unit' => $item->unit_price,
                    'reference_id' => $purchase->id,
                    'reference_type' => 'purchase_invoice',
                    'created_by' => $userId,
                ]);

                if ($item->lot_number || $item->serial_number) {
                    $lot = $this->stockLotService->addLot([
                        'product_id' => $item->product_id,
                        'warehouse_id' => $purchase->warehouse_id,
                        'lot_number' => $item->lot_number,
                        'serial_number' => $item->serial_number,
                        'production_date' => $item->production_date,
                        'expiry_date' => $item->expiry_date,
                        'quantity' => $item->quantity,
                        'purchase_invoice_item_id' => $item->id,
                    ], $userId);

                    $item->update(['stock_lot_id' => $lot->id]);
                }
            }

            // ── Supplier balance ──
            $owedAmount = round($purchase->total - $paidAmount, 2);
            if ($owedAmount > 0) {
                $supplier = SupplierModel::lockForUpdate()->find($purchase->supplier_id);
                if ($supplier) {
                    $supplier->balance += $owedAmount;
                    $supplier->save();
                }
            }

            // ── Update status ──
            $purchase->update(['status' => 'confirmed']);

            // ── Validate fiscal period ──
            $this->fiscalPeriodService->validatePostingDate(new \DateTimeImmutable());

            // ── Journal Entry ──
            $this->createJournalEntry($purchase, $paidAmount, $owedAmount, $userId);
        });
    }

    private function createJournalEntry(
        PurchaseInvoiceModel $purchase,
        float $paidAmount,
        float $owedAmount,
        string $userId
    ): void {
        $entryNumber = $this->journalEntryRepository->getNextEntryNumber();

        $journalEntry = new JournalEntry(
            id: null,
            entryNumber: $entryNumber,
            date: new \DateTimeImmutable(),
            description: "Purchase Invoice: {$purchase->invoice_number}",
            isPosted: false,
            referenceType: 'purchase_invoice',
            referenceId: $purchase->id,
            createdBy: $userId,
        );

        // Debit: Inventory (net of VAT)
        $journalEntry->addLine(new JournalEntryLine(
            id: null,
            journalEntryId: '',
            accountId: $this->accountMapping->resolve('inventory'),
            debit: round($purchase->subtotal, 2),
            credit: 0,
            description: 'Inventory from purchase',
        ));

        // Debit: Input VAT
        if ($purchase->vat_amount > 0) {
            $journalEntry->addLine(new JournalEntryLine(
                id: null,
                journalEntryId: '',
                accountId: $this->accountMapping->resolve('vat_input'),
                debit: round($purchase->vat_amount, 2),
                credit: 0,
                description: 'Input VAT on purchase',
            ));
        }

        // Credit: Cash (paid)
        if ($paidAmount > 0) {
            $journalEntry->addLine(new JournalEntryLine(
                id: null,
                journalEntryId: '',
                accountId: $this->accountMapping->resolve('cash'),
                debit: 0,
                credit: round($paidAmount, 2),
                description: 'Cash payment for purchase',
            ));
        }

        // Credit: Accounts Payable (owed)
        if ($owedAmount > 0) {
            $journalEntry->addLine(new JournalEntryLine(
                id: null,
                journalEntryId: '',
                accountId: $this->accountMapping->resolve('ap'),
                debit: 0,
                credit: round($owedAmount, 2),
                description: 'Accounts Payable - Supplier credit',
            ));
        }

        $journalEntry->post();
        $this->journalEntryRepository->create($journalEntry);
    }
}
