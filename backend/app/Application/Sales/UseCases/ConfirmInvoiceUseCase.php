<?php

declare(strict_types=1);

namespace App\Application\Sales\UseCases;

use App\Domain\Sales\Entities\Invoice;
use App\Domain\Sales\Repositories\InvoiceRepositoryInterface;
use App\Domain\Inventory\Repositories\ProductRepositoryInterface;
use App\Domain\Accounting\Repositories\JournalEntryRepositoryInterface;
use App\Domain\Accounting\Entities\JournalEntry;
use App\Domain\Accounting\Entities\JournalEntryLine;
use App\Domain\Accounting\Services\AccountMappingService;
use App\Domain\Accounting\Services\FiscalPeriodService;
use App\Domain\Inventory\Services\InventoryValuationService;
use App\Domain\Inventory\Services\StockLotService;
use App\Jobs\SubmitZatcaInvoiceJob;
use Illuminate\Support\Facades\DB;

/**
 * ConfirmInvoiceUseCase
 *
 * Handles the full invoice confirmation lifecycle:
 * 1. Validates invoice status is confirmable
 * 2. Deducts stock with pessimistic row locking (prevents race conditions)
 * 3. Updates customer balance (credit invoices)
 * 4. Updates customer loyalty points
 * 5. Deposits paid amount into treasury safe
 * 6. Creates double-entry journal entries using tenant-configured account mappings
 * 7. Dispatches ZATCA Phase 2 job
 */
class ConfirmInvoiceUseCase
{
    public function __construct(
        private InvoiceRepositoryInterface $invoiceRepository,
        private ProductRepositoryInterface $productRepository,
        private JournalEntryRepositoryInterface $journalEntryRepository,
        private AccountMappingService $accountMapping,
        private FiscalPeriodService $fiscalPeriodService,
        private InventoryValuationService $inventoryValuationService,
        private StockLotService $stockLotService,
    ) {}

    public function execute(string $invoiceId, string $userId): void
    {
        DB::transaction(function () use ($invoiceId, $userId) {
            $invoice = $this->invoiceRepository->findById($invoiceId);
            if (!$invoice) {
                throw new \DomainException("Invoice not found.");
            }

            if ($invoice->getStatus() !== 'pending_approval' && $invoice->getStatus() !== 'draft') {
                throw new \DomainException("Invoice cannot be confirmed in its current state.");
            }

            // Change status
            $invoice->confirm();
            $this->invoiceRepository->update($invoice);

            // ── Stock deduction with pessimistic locking ──
            $totalCogs = 0;
            foreach ($invoice->getItems() as $item) {
                $currentStock = $this->productRepository->getStockLevelForUpdate(
                    $item->getProductId(),
                    $invoice->getWarehouseId()
                );

                if ($currentStock < $item->getQuantity()) {
                    throw new \DomainException("Insufficient stock for product: {$item->getProductId()}");
                }

                $costUsed = $this->inventoryValuationService->recordMovement(
                    $item->getProductId(),
                    $invoice->getWarehouseId(),
                    -$item->getQuantity(),
                    $item->getUnitPrice(), // Unit price ignored for outgoing
                    'sale',
                    $invoice->getId(),
                    $userId
                );

                $totalCogs += ($item->getQuantity() * $costUsed);

                if ($item->getStockLotId()) {
                    $this->stockLotService->deductLot(
                        $item->getStockLotId(),
                        $item->getQuantity(),
                        $invoice->getWarehouseId()
                    );
                }
            }

            // ── Customer balance & loyalty ──
            $totalAmount = $invoice->getTotal();
            $paidAmount = $invoice->getType() === 'cash' ? $totalAmount : $invoice->getPaidAmount();

            if ($invoice->getCustomerId()) {
                $customerModel = \App\Infrastructure\Eloquent\Models\CustomerModel::lockForUpdate()
                    ->find($invoice->getCustomerId());

                if ($customerModel) {
                    // Credit balance
                    if ($invoice->getType() === 'credit') {
                        $due = $totalAmount - $paidAmount;
                        $customerModel->balance += $due;
                    }

                    // Loyalty points
                    $earnedPoints = floor($totalAmount / 10);
                    $customerModel->loyalty_points += $earnedPoints;

                    if ($customerModel->loyalty_points >= 1000) {
                        $customerModel->segment = 'VIP';
                    } elseif ($customerModel->loyalty_points >= 500) {
                        $customerModel->segment = 'Gold';
                    } elseif (!$customerModel->segment) {
                        $customerModel->segment = 'Regular';
                    }

                    $customerModel->save();
                }
            }

            // ── Treasury safe deposit ──
            if ($paidAmount > 0) {
                $safeId = DB::connection('tenant')->table('safe_users')
                    ->where('user_id', $userId)
                    ->where('is_primary', true)
                    ->value('safe_id');

                if (!$safeId) {
                    $safeId = \App\Infrastructure\Eloquent\Models\SafeModel::where('type', 'cash')->value('id');
                }

                if ($safeId) {
                    $safe = \App\Infrastructure\Eloquent\Models\SafeModel::lockForUpdate()->find($safeId);
                    if ($safe) {
                        $safe->balance += $paidAmount;
                        $safe->save();

                        \App\Infrastructure\Eloquent\Models\SafeTransactionModel::create([
                            'id' => \Illuminate\Support\Str::uuid()->toString(),
                            'safe_id' => $safe->id,
                            'type' => 'deposit',
                            'amount' => $paidAmount,
                            'description' => 'إيداع نقدي لفاتورة مبيعات رقم: ' . $invoice->getInvoiceNumber(),
                            'reference_type' => 'sales_invoice',
                            'reference_id' => $invoice->getId(),
                            'created_by' => $userId,
                            'transaction_date' => now(),
                        ]);
                    }
                }
            }

            // ── Validate fiscal period before posting ──
            $this->fiscalPeriodService->validatePostingDate(new \DateTimeImmutable());

            // ── Journal entry with tenant-configured accounts ──
            $this->createJournalEntry($invoice, $totalCogs, $userId);

            // ── ZATCA Phase 2 ──
            $tenantId = app('currentTenant')->id ?? 'tenant_context';
            SubmitZatcaInvoiceJob::dispatch($invoice->getId(), $tenantId);

            // ── Dispatch webhook event ──
            app(\App\Application\Services\Webhooks\WebhookService::class)
                ->dispatch('invoice.confirmed', [
                    'invoice_id' => $invoice->getId(),
                    'total'      => $invoice->getTotal(),
                    'status'     => 'confirmed',
                ]);
        });
    }

    private function createJournalEntry(Invoice $invoice, float $totalCogs, string $userId): void
    {
        $entryNumber = $this->journalEntryRepository->getNextEntryNumber();

        $journalEntry = new JournalEntry(
            id: null,
            entryNumber: $entryNumber,
            date: new \DateTimeImmutable(),
            description: "Sales Invoice: {$invoice->getInvoiceNumber()}",
            isPosted: false,
            referenceType: 'invoice',
            referenceId: $invoice->getId(),
            createdBy: $userId,
        );

        $paidAmount = $invoice->getType() === 'cash' ? $invoice->getTotal() : $invoice->getPaidAmount();
        $dueAmount = $invoice->getTotal() - $paidAmount;

        // Debit: Cash (for paid amount)
        if ($paidAmount > 0) {
            $journalEntry->addLine(new JournalEntryLine(
                id: null,
                journalEntryId: '',
                accountId: $this->accountMapping->resolve('cash'),
                debit: round($paidAmount, 2),
                credit: 0,
                description: 'Cash payment for sales',
            ));
        }

        // Debit: Accounts Receivable (for due amount)
        if ($dueAmount > 0) {
            $journalEntry->addLine(new JournalEntryLine(
                id: null,
                journalEntryId: '',
                accountId: $this->accountMapping->resolve('ar'),
                debit: round($dueAmount, 2),
                credit: 0,
                description: 'Credit sales - Accounts Receivable',
            ));
        }

        // Credit: Revenue (net of discount)
        $netRevenue = round($invoice->getSubtotal() - $invoice->getDiscountAmount(), 2);
        $journalEntry->addLine(new JournalEntryLine(
            id: null,
            journalEntryId: '',
            accountId: $this->accountMapping->resolve('revenue'),
            debit: 0,
            credit: $netRevenue,
            description: 'Sales revenue',
        ));

        // Credit: VAT Payable
        if ($invoice->getVatAmount() > 0) {
            $journalEntry->addLine(new JournalEntryLine(
                id: null,
                journalEntryId: '',
                accountId: $this->accountMapping->resolve('vat_payable'),
                debit: 0,
                credit: round($invoice->getVatAmount(), 2),
                description: 'VAT payable',
            ));
        }

        // Debit: Cost of Goods Sold (COGS)
        if ($totalCogs > 0) {
            $journalEntry->addLine(new JournalEntryLine(
                id: null,
                journalEntryId: '',
                accountId: $this->accountMapping->resolve('cogs'),
                debit: round($totalCogs, 2),
                credit: 0,
                description: 'Cost of Goods Sold',
            ));

            // Credit: Inventory
            $journalEntry->addLine(new JournalEntryLine(
                id: null,
                journalEntryId: '',
                accountId: $this->accountMapping->resolve('inventory'),
                debit: 0,
                credit: round($totalCogs, 2),
                description: 'Inventory deduction',
            ));
        }

        $journalEntry->post();
        $this->journalEntryRepository->create($journalEntry);
    }
}
