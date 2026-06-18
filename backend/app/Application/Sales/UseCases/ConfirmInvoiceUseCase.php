<?php

declare(strict_types=1);

namespace App\Application\Sales\UseCases;

use App\Application\Accounting\Services\ExchangeRateService;
use App\Application\Services\Webhooks\WebhookService;
use App\Domain\Accounting\Entities\JournalEntry;
use App\Domain\Accounting\Entities\JournalEntryLine;
use App\Domain\Accounting\Repositories\JournalEntryRepositoryInterface;
use App\Domain\Accounting\Services\AccountMappingService;
use App\Domain\Accounting\Services\FiscalPeriodService;
use App\Domain\Inventory\Repositories\ProductRepositoryInterface;
use App\Domain\Inventory\Services\InventoryValuationService;
use App\Domain\Inventory\Services\StockLotService;
use App\Domain\Sales\Entities\Invoice;
use App\Domain\Sales\Repositories\InvoiceRepositoryInterface;
use App\Domain\Sales\Services\ZatcaPhase1Service;
use App\Infrastructure\Eloquent\Models\CustomerModel;
use App\Infrastructure\Eloquent\Models\InvoiceModel;
use App\Infrastructure\Eloquent\Models\ProductComponentModel;
use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\SafeModel;
use App\Infrastructure\Eloquent\Models\SafeTransactionModel;
use App\Infrastructure\Eloquent\Models\SafeUserModel;
use App\Jobs\SubmitZatcaInvoiceJob;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

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
        private ExchangeRateService $exchangeRateService,
        private InventoryValuationService $inventoryValuationService,
        private StockLotService $stockLotService,
        private ZatcaPhase1Service $zatcaPhase1Service,
    ) {}

    public function execute(string $invoiceId, string $userId): void
    {
        DB::transaction(function () use ($invoiceId, $userId) {
            $invoice = $this->invoiceRepository->findById($invoiceId);
            if (! $invoice) {
                throw new \DomainException('Invoice not found.');
            }

            if ($invoice->getStatus() !== 'pending_approval' && $invoice->getStatus() !== 'draft') {
                throw new \DomainException('Invoice cannot be confirmed in its current state.');
            }

            // Change status
            $invoice->confirm();

            // Generate ZATCA Phase 1 QR Code
            $sellerName = 'شركة تجريبية'; // Should be fetched from tenant_settings
            $vatNumber = '300000000000003';

            $qrCode = $this->zatcaPhase1Service->generateQrBase64(
                $sellerName,
                $vatNumber,
                $invoice->getInvoiceDate(),
                $invoice->getTotal(),
                $invoice->getVatAmount()
            );
            $invoice->setZatcaQrCode($qrCode);

            $this->invoiceRepository->update($invoice);

            // ── Stock deduction with pessimistic locking ──
            $totalCogs = 0;
            foreach ($invoice->getItems() as $item) {
                $productModel = ProductModel::query()->find($item->getProductId());

                if ($productModel && $productModel->is_kit) {
                    $components = ProductComponentModel::query()->where('parent_product_id', $productModel->id)->get();
                    if ($components->isEmpty()) {
                        throw new \DomainException("Kit product {$productModel->name} has no components defined.");
                    }
                    foreach ($components as $component) {
                        $qtyRequired = $component->quantity_required * $item->getQuantity();
                        $currentStock = $this->productRepository->getStockLevelForUpdate(
                            $component->child_product_id,
                            $invoice->getWarehouseId()
                        );
                        if ($currentStock < $qtyRequired) {
                            throw new \DomainException("Insufficient stock for kit component: {$component->child_product_id}");
                        }
                        $totalCost = $this->inventoryValuationService->recordMovement(
                            $component->child_product_id,
                            $invoice->getWarehouseId(),
                            -$qtyRequired,
                            $item->getUnitPrice(), // Ignored for outgoing
                            'sale',
                            $invoice->getId(),
                            $userId
                        );
                        $totalCogs += $totalCost;
                    }
                } else {
                    $currentStock = $this->productRepository->getStockLevelForUpdate(
                        $item->getProductId(),
                        $invoice->getWarehouseId()
                    );

                    if ($currentStock < $item->getQuantity()) {
                        throw new \DomainException("Insufficient stock for product: {$item->getProductId()}");
                    }

                    $totalCost = $this->inventoryValuationService->recordMovement(
                        $item->getProductId(),
                        $invoice->getWarehouseId(),
                        -$item->getQuantity(),
                        $item->getUnitPrice(), // Unit price ignored for outgoing
                        'sale',
                        $invoice->getId(),
                        $userId
                    );

                    $totalCogs += $totalCost;

                    if ($item->getStockLotId()) {
                        $this->stockLotService->deductLot(
                            $item->getStockLotId(),
                            $item->getQuantity(),
                            $invoice->getWarehouseId()
                        );
                    }
                }

                // ── Auto-generate Warranty ──
                if ($productModel && $productModel->warranty_months > 0 && $invoice->getCustomerId()) {
                    $invoiceModel = InvoiceModel::query()->find($invoice->getId());
                    
                    $lastWarranty = \App\Infrastructure\Eloquent\Models\WarrantyModel::latest('created_at')->first();
                    $lastNum = $lastWarranty ? ((int) str_replace('WRN-', '', $lastWarranty->warranty_number)) : 0;
                    
                    $maxWarrantyNumber = \App\Infrastructure\Eloquent\Models\WarrantyModel::max('warranty_number');
                    if ($maxWarrantyNumber) {
                        $maxNum = (int) str_replace('WRN-', '', $maxWarrantyNumber);
                        if ($maxNum > $lastNum) {
                            $lastNum = $maxNum;
                        }
                    }
                    
                    $warrantyNumber = 'WRN-' . str_pad((string) ($lastNum + 1), 6, '0', STR_PAD_LEFT);

                    $expiryDate = $invoice->getInvoiceDate()->modify('+' . $productModel->warranty_months . ' months');

                    \App\Infrastructure\Eloquent\Models\WarrantyModel::create([
                        'tenant_id' => $invoiceModel ? $invoiceModel->tenant_id : request()->header('X-Tenant-ID'),
                        'warranty_number' => $warrantyNumber,
                        'invoice_id' => $invoice->getId(),
                        'invoice_item_id' => $item->getId(),
                        'product_id' => $item->getProductId(),
                        'customer_id' => $invoice->getCustomerId(),
                        'quantity' => $item->getQuantity(),
                        'sale_date' => $invoice->getInvoiceDate()->format('Y-m-d'),
                        'warranty_months' => $productModel->warranty_months,
                        'expiry_date' => $expiryDate->format('Y-m-d'),
                        'status' => 'active',
                        'created_by' => $userId,
                    ]);
                }
            }

            // ── Customer balance & loyalty ──
            $totalAmount = $invoice->getTotal();
            $paidAmount = $invoice->getType() === 'cash' ? $totalAmount : $invoice->getPaidAmount();

            if ($invoice->getCustomerId()) {
                $customerModel = CustomerModel::query()->lockForUpdate()
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
                    } elseif (! $customerModel->segment) {
                        $customerModel->segment = 'Regular';
                    }

                    $customerModel->save();
                }
            }

            // ── Treasury safe deposit ──
            if ($paidAmount > 0) {
                $safeId = SafeUserModel::query()
                    ->where('user_id', $userId)
                    ->where('is_primary', true)
                    ->value('safe_id');

                if (! $safeId) {
                    $safeId = SafeModel::query()->where('type', 'cash')->value('id');
                }

                if ($safeId) {
                    $safe = SafeModel::query()->lockForUpdate()->find($safeId);
                    if ($safe) {
                        $safe->balance += $paidAmount;
                        $safe->save();

                        SafeTransactionModel::query()->create([
                            'id' => Str::uuid()->toString(),
                            'safe_id' => $safe->id,
                            'type' => 'deposit',
                            'amount' => $paidAmount,
                            'description' => 'إيداع نقدي لفاتورة مبيعات رقم: '.$invoice->getInvoiceNumber(),
                            'reference_type' => 'sales_invoice',
                            'reference_id' => $invoice->getId(),
                            'created_by' => $userId,
                            'transaction_date' => now(),
                        ]);
                    }
                }
            }

            // ── Validate fiscal period before posting ──
            $this->fiscalPeriodService->validatePostingDate(new \DateTimeImmutable);

            // ── Journal entry with tenant-configured accounts ──
            $this->createJournalEntry($invoice, $totalCogs, $userId);

            // ── ZATCA Phase 2 ──
            $tenantId = app('current_tenant')->id ?? 'tenant_context';
            SubmitZatcaInvoiceJob::dispatch($invoice->getId(), $tenantId);

            // ── Dispatch webhook event ──
            (new WebhookService($tenantId))
                ->dispatch('invoice.confirmed', [
                    'invoice_id' => $invoice->getId(),
                    'total' => $invoice->getTotal(),
                    'status' => 'confirmed',
                ]);
        });
    }

    private function createJournalEntry(Invoice $invoice, float $totalCogs, string $userId): void
    {
        $tenantId = app('current_tenant')->id ?? 'tenant_context';
        $entryNumber = $this->journalEntryRepository->getNextEntryNumber();

        // Fetch Invoice Currency
        $invoiceModel = InvoiceModel::query()->find($invoice->getId());
        $currencyId = $invoiceModel->currency_id;
        $exchangeRate = (float) $invoiceModel->exchange_rate;
        $costCenterId = $invoiceModel->cost_center_id;
        if (! $currencyId) {
            $baseCurrency = $this->exchangeRateService->getBaseCurrency($tenantId);
            $currencyId = $baseCurrency->id;
            $exchangeRate = 1.0;
        }

        $journalEntry = new JournalEntry(
            id: null,
            entryNumber: $entryNumber,
            date: new \DateTimeImmutable,
            description: "Sales Invoice: {$invoice->getInvoiceNumber()}",
            transactionCurrencyId: $currencyId,
            exchangeRate: $exchangeRate,
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
                debit: round($paidAmount * $exchangeRate, 2),
                credit: 0,
                transactionDebit: round($paidAmount, 2),
                transactionCredit: 0.0,
                description: 'Cash payment for sales',
            ));
        }

        // Debit: Accounts Receivable (for due amount)
        if ($dueAmount > 0) {
            $journalEntry->addLine(new JournalEntryLine(
                id: null,
                journalEntryId: '',
                accountId: $this->accountMapping->resolve('ar'),
                debit: round($dueAmount * $exchangeRate, 2),
                credit: 0,
                transactionDebit: round($dueAmount, 2),
                transactionCredit: 0.0,
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
            credit: round($netRevenue * $exchangeRate, 2),
            transactionDebit: 0.0,
            transactionCredit: round($netRevenue, 2),
            description: 'Sales revenue',
            costCenterId: $costCenterId,
        ));

        // Credit: VAT Payable
        if ($invoice->getVatAmount() > 0) {
            $journalEntry->addLine(new JournalEntryLine(
                id: null,
                journalEntryId: '',
                accountId: $this->accountMapping->resolve('vat_payable'),
                debit: 0,
                credit: round($invoice->getVatAmount() * $exchangeRate, 2),
                transactionDebit: 0.0,
                transactionCredit: round($invoice->getVatAmount(), 2),
                description: 'VAT payable',
            ));
        }

        // COGS and Inventory are always in Base Currency (Local Valuation)
        if ($totalCogs > 0) {
            $journalEntry->addLine(new JournalEntryLine(
                id: null,
                journalEntryId: '',
                accountId: $this->accountMapping->resolve('cogs'),
                debit: round($totalCogs, 2),
                credit: 0,
                transactionDebit: round($totalCogs, 2),
                transactionCredit: 0.0,
                description: 'Cost of goods sold',
                costCenterId: $costCenterId,
            ));

            $journalEntry->addLine(new JournalEntryLine(
                id: null,
                journalEntryId: '',
                accountId: $this->accountMapping->resolve('inventory'),
                debit: 0,
                credit: round($totalCogs, 2),
                transactionDebit: 0.0,
                transactionCredit: round($totalCogs, 2),
                description: 'Inventory deduction',
            ));
        }

        $journalEntry->post();
        $this->journalEntryRepository->create($journalEntry);
    }
}
