<?php

declare(strict_types=1);

namespace App\Application\Purchases\UseCases;

use App\Application\Accounting\Services\ExchangeRateService;
use App\Domain\Accounting\Entities\JournalEntry;
use App\Domain\Accounting\Entities\JournalEntryLine;
use App\Domain\Accounting\Repositories\JournalEntryRepositoryInterface;
use App\Domain\Accounting\Services\AccountMappingService;
use App\Domain\Accounting\Services\FiscalPeriodService;
use App\Domain\Inventory\Services\InventoryValuationService;
use App\Domain\Inventory\Services\StockLotService;
use App\Infrastructure\Eloquent\Models\PurchaseInvoiceModel;
use App\Infrastructure\Eloquent\Models\SupplierModel;
use Illuminate\Support\Facades\DB;

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
        private ExchangeRateService $exchangeRateService,
        private StockLotService $stockLotService,
        private InventoryValuationService $inventoryValuationService,
    ) {}

    public function execute(string $purchaseId, string $paymentType, string $userId): void
    {
        $closure = function () use ($purchaseId, $paymentType, $userId) {
            $purchase = PurchaseInvoiceModel::query()->with('items')->lockForUpdate()->findOrFail($purchaseId);

            if ($purchase->status === 'confirmed') {
                throw new \DomainException('Purchase invoice is already confirmed.');
            }

            $paidAmount = $paymentType === 'cash' ? (float) $purchase->total : 0.0;

            // ── Stock addition with row locks ──
            foreach ($purchase->items as $item) {
                $this->inventoryValuationService->recordMovement(
                    $item->product_id,
                    $purchase->warehouse_id,
                    (float) $item->quantity,
                    (float) $item->unit_price,
                    'purchase',
                    $purchase->id,
                    $userId
                );

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
            $owedAmount = round((float) $purchase->total - $paidAmount, 2);
            if ($owedAmount > 0) {
                $supplier = SupplierModel::query()->lockForUpdate()->find($purchase->supplier_id);
                if ($supplier) {
                    $supplier->balance += $owedAmount;
                    $supplier->save();
                }
            }

            // ── Update status ──
            $purchase->update(['status' => 'confirmed']);

            // ── Validate fiscal period ──
            $this->fiscalPeriodService->validatePostingDate(new \DateTimeImmutable);

            // ── Journal Entry ──
            $this->createJournalEntry($purchase, $paidAmount, $owedAmount, $userId);
        };

        if (app()->environment() === 'testing') {
            $closure();

            return;
        }

        DB::connection('tenant')->transaction($closure);
    }

    private function createJournalEntry(
        PurchaseInvoiceModel $purchase,
        float $paidAmount,
        float $owedAmount,
        string $userId
    ): void {
        $tenantId = app('current_tenant')->id ?? 'tenant_context';
        $entryNumber = $this->journalEntryRepository->getNextEntryNumber();

        $currencyId = $purchase->currency_id;
        $exchangeRate = (float) $purchase->exchange_rate;
        $costCenterId = $purchase->cost_center_id;
        if (! $currencyId) {
            $baseCurrency = $this->exchangeRateService->getBaseCurrency($tenantId);
            $currencyId = $baseCurrency->id;
            $exchangeRate = 1.0;
        }

        $journalEntry = new JournalEntry(
            id: null,
            entryNumber: $entryNumber,
            date: new \DateTimeImmutable,
            description: "Purchase Invoice: {$purchase->invoice_number}",
            transactionCurrencyId: $currencyId,
            exchangeRate: $exchangeRate,
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
            debit: round((float) $purchase->subtotal * $exchangeRate, 2),
            credit: 0,
            transactionDebit: round((float) $purchase->subtotal, 2),
            transactionCredit: 0.0,
            description: 'Inventory from purchase',
            costCenterId: $costCenterId,
        ));

        // Debit: Input VAT
        if ($purchase->vat_amount > 0) {
            $journalEntry->addLine(new JournalEntryLine(
                id: null,
                journalEntryId: '',
                accountId: $this->accountMapping->resolve('vat_input'),
                debit: round((float) $purchase->vat_amount * $exchangeRate, 2),
                credit: 0,
                transactionDebit: round((float) $purchase->vat_amount, 2),
                transactionCredit: 0.0,
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
                credit: round($paidAmount * $exchangeRate, 2),
                transactionDebit: 0.0,
                transactionCredit: round($paidAmount, 2),
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
                credit: round($owedAmount * $exchangeRate, 2),
                transactionDebit: 0.0,
                transactionCredit: round($owedAmount, 2),
                description: 'Accounts Payable - Supplier credit',
            ));
        }

        $journalEntry->post();
        $this->journalEntryRepository->create($journalEntry);
    }
}
