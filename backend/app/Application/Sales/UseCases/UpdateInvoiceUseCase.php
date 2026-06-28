<?php

declare(strict_types=1);

namespace App\Application\Sales\UseCases;

use App\Application\Sales\DTOs\UpdateInvoiceDTO;
use App\Domain\Sales\Entities\Invoice;
use App\Domain\Sales\Entities\InvoiceItem;
use App\Domain\Sales\Repositories\InvoiceRepositoryInterface;
use App\Domain\Sales\Repositories\SalesChannelRepositoryInterface;
use App\Infrastructure\Eloquent\Models\InvoiceItemModel;
use App\Infrastructure\Eloquent\Models\InvoiceModel;
use Illuminate\Support\Facades\DB;

/**
 * UpdateInvoiceUseCase
 *
 * Updates a DRAFT invoice (header + full item replacement). Confirmation is NOT
 * handled here — when the caller requests status=confirmed, this delegates to
 * ConfirmInvoiceUseCase, the single source of truth for the confirmation
 * lifecycle (stock with pessimistic locking, kits/BOM, warranties, commission,
 * customer balance & loyalty, treasury deposit, account-mapped journal entry,
 * ZATCA, webhooks). This keeps confirmation logic in exactly one place.
 */
final class UpdateInvoiceUseCase
{
    public function __construct(
        private InvoiceRepositoryInterface $invoiceRepository,
        private SalesChannelRepositoryInterface $salesChannelRepository,
        private ConfirmInvoiceUseCase $confirmInvoiceUseCase,
    ) {}

    public function execute(UpdateInvoiceDTO $dto, string $userId): Invoice
    {
        $invoice = $this->invoiceRepository->findById($dto->id);

        if (! $invoice) {
            throw new \DomainException('Invoice not found');
        }

        if ($invoice->getStatus() !== 'draft') {
            throw new \DomainException('Only draft invoices can be modified');
        }

        // Rebuild the line items from the DTO
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
                printedName: $itemDTO->printedName,
            );
        }

        $salesChannel = null;
        if ($dto->salesChannelId) {
            $salesChannel = $this->salesChannelRepository->findById($dto->salesChannelId);
        }

        // Build the updated entity — status stays 'draft'; confirmation is delegated below.
        $updatedInvoice = new Invoice(
            id: $invoice->getId(),
            invoiceNumber: $invoice->getInvoiceNumber(),
            customerId: $dto->customerId,
            type: $dto->type,
            subtotal: 0,
            vatAmount: 0,
            discountAmount: 0,
            total: 0,
            status: $invoice->getStatus(), // 'draft'
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
            pricingAdjustmentValue: $salesChannel
                ? ($salesChannel->getPricingMethod() === 'percentage'
                    ? $salesChannel->getMarkupPercentage()
                    : $salesChannel->getFixedMarkup())
                : null,
            dueDate: $dto->dueDate ? new \DateTimeImmutable($dto->dueDate) : null,
            internalNotes: $dto->internalNotes,
            referenceNo: $dto->referenceNo,
            paidAmount: $dto->type === 'cash' ? 0 : $dto->paidAmount,
            salespersonId: $dto->salespersonId ?? $invoice->getSalespersonId(),
            paymentMethod: $dto->paymentMethod,
        );

        $updatedInvoice->setItems($items);

        return DB::connection('tenant')->transaction(function () use ($dto, $userId, $updatedInvoice) {
            // ── 1. Persist the draft edits (full item replacement + header). Status stays 'draft'. ──
            InvoiceItemModel::query()
                ->where('invoice_id', $updatedInvoice->getId())
                ->delete();

            InvoiceModel::query()->where('id', $updatedInvoice->getId())->update([
                'customer_id' => $updatedInvoice->getCustomerId(),
                'type' => $updatedInvoice->getType(),
                'subtotal' => $updatedInvoice->getSubtotal(),
                'vat_amount' => $updatedInvoice->getVatAmount(),
                'discount_amount' => $updatedInvoice->getDiscountAmount(),
                'total' => $updatedInvoice->getTotal(),
                'status' => $updatedInvoice->getStatus(), // 'draft'
                'notes' => $updatedInvoice->getNotes(),
                'warehouse_id' => $updatedInvoice->getWarehouseId(),
                'updated_by' => $userId,
                'sales_channel_id' => $updatedInvoice->getSalesChannelId(),
                'sales_channel_name' => $updatedInvoice->getSalesChannelName(),
                'pricing_adjustment_type' => $updatedInvoice->getPricingAdjustmentType(),
                'pricing_adjustment_value' => $updatedInvoice->getPricingAdjustmentValue(),
                'due_date' => $updatedInvoice->getDueDate(),
                'internal_notes' => $updatedInvoice->getInternalNotes(),
                'reference_no' => $updatedInvoice->getReferenceNo(),
                'paid_amount' => $updatedInvoice->getPaidAmount(),
                'salesperson_id' => $updatedInvoice->getSalespersonId(),
                'payment_method' => $updatedInvoice->getPaymentMethod(),
            ]);

            foreach ($updatedInvoice->getItems() as $item) {
                InvoiceItemModel::query()->create([
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
                    'printed_name' => $item->getPrintedName(),
                ]);
            }

            // ── 2. Delegate confirmation to the single source of truth. ──
            // ConfirmInvoiceUseCase re-reads the now-persisted draft within this same
            // transaction (visible because it's the same DB session), then performs the
            // full lifecycle. No confirmation logic is duplicated here.
            if ($dto->status === 'confirmed') {
                // Edit→reconfirm is an internal flow with no override channel of its own; preserve
                // its prior behaviour (it never blocked on credit limit) by allowing the override.
                $this->confirmInvoiceUseCase->execute($updatedInvoice->getId(), $userId, true);
            }

            return $this->invoiceRepository->findById($updatedInvoice->getId());
        });
    }
}
