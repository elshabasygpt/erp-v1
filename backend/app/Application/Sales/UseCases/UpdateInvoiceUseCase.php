<?php

declare(strict_types=1);

namespace App\Application\Sales\UseCases;

use App\Application\Sales\DTOs\UpdateInvoiceDTO;
use App\Domain\Sales\Entities\Invoice;
use App\Domain\Sales\Entities\InvoiceItem;
use App\Domain\Sales\Repositories\InvoiceRepositoryInterface;
use App\Domain\Sales\Rules\InvoiceRules;
use App\Domain\Inventory\Repositories\ProductRepositoryInterface;
use App\Domain\Accounting\Repositories\JournalEntryRepositoryInterface;
use App\Domain\Accounting\Entities\JournalEntry;
use App\Domain\Accounting\Entities\JournalEntryLine;
use App\Domain\Sales\Services\ZatcaPhase1Service;
use App\Jobs\SubmitZatcaInvoiceJob;
use App\Domain\Sales\Repositories\SalesChannelRepositoryInterface;

final class UpdateInvoiceUseCase
{
    public function __construct(
        private InvoiceRepositoryInterface $invoiceRepository,
        private ProductRepositoryInterface $productRepository,
        private JournalEntryRepositoryInterface $journalEntryRepository,
        private ZatcaPhase1Service $zatcaPhase1Service,
        private SalesChannelRepositoryInterface $salesChannelRepository,
    ) {}

    public function execute(UpdateInvoiceDTO $dto, string $userId): Invoice
    {
        $invoice = $this->invoiceRepository->findById($dto->id);
        
        if (!$invoice) {
            throw new \DomainException("Invoice not found");
        }

        if ($invoice->getStatus() !== 'draft') {
            throw new \DomainException("Only draft invoices can be modified");
        }

        $items = [];
        foreach ($dto->items as $itemDTO) {
            $items[] = new InvoiceItem(
                id: null,
                invoiceId: $invoice->getId(),
                productId: $itemDTO->productId,
                quantity: $itemDTO->quantity,
                unitPrice: $itemDTO->unitPrice,
                discountPercent: $itemDTO->discountPercent,
                vatRate: $itemDTO->vatRate,
                productName: null,
                baseUnitPrice: $itemDTO->baseUnitPrice,
                adjustedUnitPrice: $itemDTO->adjustedUnitPrice,
                adjustmentAmount: $itemDTO->adjustmentAmount,
            );
        }

        // We should replace the entire invoice using a new instance since Entities are somewhat immutable
        // But since this is PHP, we will use reflection or recreate the invoice entirely
        
        $salesChannel = null;
        if ($dto->salesChannelId) {
            $salesChannel = $this->salesChannelRepository->findById($dto->salesChannelId);
        }

        $updatedInvoice = new Invoice(
            id: $invoice->getId(),
            invoiceNumber: $invoice->getInvoiceNumber(),
            customerId: $dto->customerId,
            type: $dto->type,
            subtotal: 0,
            vatAmount: 0,
            discountAmount: 0,
            total: 0,
            status: $dto->status,
            notes: $dto->notes,
            warehouseId: $dto->warehouseId,
            createdBy: $invoice->getCreatedBy(),
            updatedBy: $userId,
            invoiceDate: $invoice->getInvoiceDate(),
            zatcaQrCode: $invoice->getZatcaQrCode(),
            zatcaXml: $invoice->getZatcaXml(),
            zatcaHash: $invoice->getZatcaHash(),
            zatcaUuid: $invoice->getZatcaUuid(),
            zatcaStatus: $invoice->getZatcaStatus(),
            zatcaErrorMessage: $invoice->getZatcaErrorMessage(),
            salesChannelId: $salesChannel?->getId(),
            salesChannelName: $salesChannel?->getName(),
            pricingAdjustmentType: $salesChannel ? $salesChannel->getPricingMethod() : null,
            pricingAdjustmentValue: $salesChannel ? ($salesChannel->getPricingMethod() === 'percentage' ? $salesChannel->getMarkupPercentage() : $salesChannel->getFixedMarkup()) : null,
            dueDate: $dto->dueDate ? new \DateTimeImmutable($dto->dueDate) : null,
            internalNotes: $dto->internalNotes,
            referenceNo: $dto->referenceNo,
            paidAmount: $dto->type === 'cash' ? 0 : $dto->paidAmount, // Will calculate later
            salespersonId: $dto->salespersonId ?? $invoice->getSalespersonId(),
        );

        $updatedInvoice->setItems($items);

        if ($dto->status === 'confirmed') {
            $errors = InvoiceRules::validateForConfirmation($updatedInvoice);
            if (!empty($errors)) {
                throw new \DomainException(implode(' ', $errors));
            }

            $updatedInvoice->confirm();

            $sellerName = 'شركة تجريبية';
            $vatNumber = '300000000000003'; 
            
            $qrCode = $this->zatcaPhase1Service->generateQrBase64(
                $sellerName,
                $vatNumber,
                $updatedInvoice->getInvoiceDate(),
                $updatedInvoice->getTotal(),
                $updatedInvoice->getVatAmount()
            );
            $updatedInvoice->setZatcaQrCode($qrCode);
        }

        // To properly update, we must delete old items and save new items.
        // The EloquentInvoiceRepository `update` method does not handle item replacement natively!
        // We need to handle this. Let's rely on standard delete-and-create pattern in repository or here.
        // Actually, since EloquentInvoiceRepository `update` only updates the invoice table, we need to fix it.
        // Let's call a method in the repository. Wait, `update()` in EloquentInvoiceRepository does not save items!
        
        \Illuminate\Support\Facades\DB::beginTransaction();
        try {
            \App\Infrastructure\Eloquent\Models\InvoiceItemModel::where('invoice_id', $updatedInvoice->getId())->delete();
            $savedInvoice = clone $updatedInvoice;
            
            // Delete the invoice header so we can recreate it, or use standard update
            \App\Infrastructure\Eloquent\Models\InvoiceModel::where('id', $updatedInvoice->getId())->update([
                'customer_id' => $updatedInvoice->getCustomerId(),
                'type' => $updatedInvoice->getType(),
                'subtotal' => $updatedInvoice->getSubtotal(),
                'vat_amount' => $updatedInvoice->getVatAmount(),
                'discount_amount' => $updatedInvoice->getDiscountAmount(),
                'total' => $updatedInvoice->getTotal(),
                'status' => $updatedInvoice->getStatus(),
                'notes' => $updatedInvoice->getNotes(),
                'warehouse_id' => $updatedInvoice->getWarehouseId(),
                'updated_by' => $updatedInvoice->getCreatedBy(),
                'zatca_qr_code' => $updatedInvoice->getZatcaQrCode(),
                'sales_channel_id' => $updatedInvoice->getSalesChannelId(),
                'sales_channel_name' => $updatedInvoice->getSalesChannelName(),
                'pricing_adjustment_type' => $updatedInvoice->getPricingAdjustmentType(),
                'pricing_adjustment_value' => $updatedInvoice->getPricingAdjustmentValue(),
                'due_date' => $updatedInvoice->getDueDate(),
                'internal_notes' => $updatedInvoice->getInternalNotes(),
                'reference_no' => $updatedInvoice->getReferenceNo(),
                'paid_amount' => $updatedInvoice->getPaidAmount(),
                'salesperson_id' => $updatedInvoice->getSalespersonId(),
            ]);

            foreach ($updatedInvoice->getItems() as $item) {
                \App\Infrastructure\Eloquent\Models\InvoiceItemModel::create([
                    'id' => $item->getId(),
                    'invoice_id' => $updatedInvoice->getId(),
                    'product_id' => $item->getProductId(),
                    'quantity' => $item->getQuantity(),
                    'unit_price' => $item->getUnitPrice(),
                    'discount_percent' => $item->getDiscountPercent(),
                    'vat_rate' => $item->getVatRate(),
                    'total' => $item->getTotal(),
                    'base_unit_price' => $item->getBaseUnitPrice(),
                    'adjusted_unit_price' => $item->getAdjustedUnitPrice(),
                    'adjustment_amount' => $item->getAdjustmentAmount(),
                ]);
            }

            if ($dto->status === 'confirmed') {
                foreach ($dto->items as $itemDTO) {
                    $currentStock = $this->productRepository->getStockLevel($itemDTO->productId, $dto->warehouseId);
                    if ($currentStock < $itemDTO->quantity) {
                        throw new \DomainException("Insufficient stock for product: {$itemDTO->productId}");
                    }
                    $this->productRepository->adjustStock($itemDTO->productId, $dto->warehouseId, -$itemDTO->quantity, $itemDTO->unitPrice);
                }

                $totalAmount = $updatedInvoice->getTotal();
                $paidAmount = $dto->type === 'cash' ? $totalAmount : $dto->paidAmount;
                
                if ($dto->customerId) {
                    $customer = \App\Infrastructure\Eloquent\Models\CustomerModel::find($dto->customerId);
                    if ($customer) {
                        if ($dto->type === 'credit') {
                            $due = $totalAmount - $paidAmount;
                            $customer->balance += $due;
                        }

                        // CRM Loyalty Calculation
                        $earnedPoints = floor($totalAmount / 10);
                        $customer->loyalty_points += $earnedPoints;
                        
                        if ($customer->loyalty_points >= 1000) {
                            $customer->segment = 'VIP';
                        } elseif ($customer->loyalty_points >= 500) {
                            $customer->segment = 'Gold';
                        } elseif (!$customer->segment) {
                            $customer->segment = 'Regular';
                        }

                        $customer->save();
                    }
                }
                
                if ($paidAmount > 0) {
                    $safeId = \Illuminate\Support\Facades\DB::connection('tenant')->table('safe_users')
                        ->where('user_id', $userId)
                        ->where('is_primary', true)
                        ->value('safe_id');
                        
                    if ($safeId) {
                        $safe = \App\Infrastructure\Eloquent\Models\SafeModel::find($safeId);
                        if ($safe) {
                            $safe->balance += $paidAmount;
                            $safe->save();
                            
                            \App\Infrastructure\Eloquent\Models\SafeTransactionModel::create([
                                'id' => \Illuminate\Support\Str::uuid()->toString(),
                                'safe_id' => $safe->id,
                                'type' => 'deposit',
                                'amount' => $paidAmount,
                                'description' => 'أرباح نقدية لفاتورة رقم: ' . $updatedInvoice->getInvoiceNumber(),
                                'reference_type' => 'sales_invoice',
                                'reference_id' => $updatedInvoice->getId(),
                                'created_by' => $userId,
                            ]);
                        }
                    }
                }

                $entryNumber = $this->journalEntryRepository->getNextEntryNumber();
                $journalEntry = new JournalEntry(
                    id: null,
                    entryNumber: $entryNumber,
                    entryDate: new \DateTimeImmutable(),
                    description: "Sales Invoice " . $updatedInvoice->getInvoiceNumber(),
                    referenceType: 'invoice',
                    referenceId: $updatedInvoice->getId(),
                    status: 'posted',
                    createdBy: $userId
                );

                $journalEntry->addLine(new JournalEntryLine(
                    id: null,
                    journalEntryId: '',
                    accountId: '1100',
                    description: "Sales for Invoice " . $updatedInvoice->getInvoiceNumber(),
                    debit: $updatedInvoice->getTotal(),
                    credit: 0
                ));

                $journalEntry->addLine(new JournalEntryLine(
                    id: null,
                    journalEntryId: '',
                    accountId: '4100',
                    description: "Revenue for Invoice " . $updatedInvoice->getInvoiceNumber(),
                    debit: 0,
                    credit: $updatedInvoice->getSubtotal() - $updatedInvoice->getDiscountAmount()
                ));

                $journalEntry->addLine(new JournalEntryLine(
                    id: null,
                    journalEntryId: '',
                    accountId: '2200',
                    description: "VAT for Invoice " . $updatedInvoice->getInvoiceNumber(),
                    debit: 0,
                    credit: $updatedInvoice->getVatAmount()
                ));

                $this->journalEntryRepository->save($journalEntry);

                $tenantId = app('currentTenant')->id ?? 'tenant_context';
                SubmitZatcaInvoiceJob::dispatch($updatedInvoice->getId(), $tenantId);
            }

            \Illuminate\Support\Facades\DB::commit();
            return $this->invoiceRepository->findById($updatedInvoice->getId());
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\DB::rollBack();
            throw $e;
        }
    }
}
