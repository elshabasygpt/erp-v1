<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Repositories;

use App\Domain\Sales\Entities\Invoice;
use App\Domain\Sales\Entities\InvoiceItem;
use App\Domain\Sales\Repositories\InvoiceRepositoryInterface;
use App\Infrastructure\Eloquent\Models\InvoiceItemModel;
use App\Infrastructure\Eloquent\Models\InvoiceModel;
use Illuminate\Support\Facades\DB;

final class EloquentInvoiceRepository implements InvoiceRepositoryInterface
{
    public function findById(string $id): ?Invoice
    {
        $model = InvoiceModel::query()->with('items.product')->find($id);
        if (! $model) {
            return null;
        }

        return $this->toDomain($model);
    }

    public function findByInvoiceNumber(string $invoiceNumber): ?Invoice
    {
        $model = InvoiceModel::query()->with('items.product')->where('invoice_number', $invoiceNumber)->first();
        if (! $model) {
            return null;
        }

        return $this->toDomain($model);
    }

    public function create(Invoice $invoice): Invoice
    {
        return DB::connection('tenant')->transaction(function () use ($invoice) {
            $model = InvoiceModel::query()->create([
                'id' => $invoice->getId(),
                'invoice_number' => $invoice->getInvoiceNumber(),
                'customer_id' => $invoice->getCustomerId(),
                'type' => $invoice->getType(),
                'subtotal' => $invoice->getSubtotal(),
                'vat_amount' => $invoice->getVatAmount(),
                'discount_amount' => $invoice->getDiscountAmount(),
                'total' => $invoice->getTotal(),
                'status' => $invoice->getStatus(),
                'notes' => $invoice->getNotes(),
                'warehouse_id' => $invoice->getWarehouseId(),
                'invoice_date' => $invoice->getInvoiceDate(),
                'created_by' => $invoice->getCreatedBy(),
                'zatca_qr_code' => $invoice->getZatcaQrCode(),
                'zatca_xml' => $invoice->getZatcaXml(),
                'zatca_hash' => $invoice->getZatcaHash(),
                'zatca_uuid' => $invoice->getZatcaUuid(),
                'zatca_status' => $invoice->getZatcaStatus(),
                'zatca_error_message' => $invoice->getZatcaErrorMessage(),
                'sales_channel_id' => $invoice->getSalesChannelId(),
                'sales_channel_name' => $invoice->getSalesChannelName(),
                'pricing_adjustment_type' => $invoice->getPricingAdjustmentType(),
                'pricing_adjustment_value' => $invoice->getPricingAdjustmentValue(),
                'due_date' => $invoice->getDueDate(),
                'internal_notes' => $invoice->getInternalNotes(),
                'reference_no' => $invoice->getReferenceNo(),
                'paid_amount' => $invoice->getPaidAmount(),
                'salesperson_id' => $invoice->getSalespersonId(),
                'cost_center_id' => $invoice->getCostCenterId(),
                'currency_id' => $invoice->getCurrencyId(),
                'exchange_rate' => $invoice->getExchangeRate(),
                'payment_method' => $invoice->getPaymentMethod(),
            ]);

            foreach ($invoice->getItems() as $item) {
                InvoiceItemModel::query()->create([
                    'id' => $item->getId(),
                    'invoice_id' => $model->id,
                    'product_id' => $item->getProductId(),
                    'quantity' => $item->getQuantity(),
                    'unit_price' => $item->getUnitPrice(),
                    'discount_percent' => $item->getDiscountPercent(),
                    'vat_rate' => $item->getVatRate(),
                    'total' => $item->getTotal(),
                    'base_unit_price' => $item->getBaseUnitPrice(),
                    'adjusted_unit_price' => $item->getAdjustedUnitPrice(),
                    'adjustment_amount' => $item->getAdjustmentAmount(),
                    'core_charge_applied' => $item->getCoreChargeApplied(),
                    'core_charge_amount' => $item->getCoreChargeAmount(),
                ]);
            }

            return $this->findById($model->id);
        });
    }

    public function update(Invoice $invoice): Invoice
    {
        InvoiceModel::query()->where('id', $invoice->getId())->update([
            'status' => $invoice->getStatus(),
            'notes' => $invoice->getNotes(),
            'subtotal' => $invoice->getSubtotal(),
            'vat_amount' => $invoice->getVatAmount(),
            'discount_amount' => $invoice->getDiscountAmount(),
            'total' => $invoice->getTotal(),
            'updated_by' => $invoice->getCreatedBy(),
            'zatca_qr_code' => $invoice->getZatcaQrCode(),
            'zatca_xml' => $invoice->getZatcaXml(),
            'zatca_hash' => $invoice->getZatcaHash(),
            'zatca_uuid' => $invoice->getZatcaUuid(),
            'zatca_status' => $invoice->getZatcaStatus(),
            'zatca_error_message' => $invoice->getZatcaErrorMessage(),
            'payment_method' => $invoice->getPaymentMethod(),
        ]);

        return $this->findById($invoice->getId());
    }

    public function delete(string $id): bool
    {
        return InvoiceModel::query()->where('id', $id)->delete() > 0;
    }

    public function getNextInvoiceNumber(): string
    {
        $last = InvoiceModel::query()->orderBy('created_at', 'desc')->first();
        $nextNum = $last ? ((int) substr($last->invoice_number, 4)) + 1 : 1;

        return 'INV-'.str_pad((string) $nextNum, 6, '0', STR_PAD_LEFT);
    }

    public function paginate(int $perPage = 15, array $filters = []): array
    {
        $query = InvoiceModel::query()->with('items', 'customer');

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (! empty($filters['type'])) {
            $query->where('type', $filters['type']);
        }
        if (! empty($filters['from'])) {
            $query->where('invoice_date', '>=', $filters['from']);
        }
        if (! empty($filters['to'])) {
            $query->where('invoice_date', '<=', $filters['to']);
        }
        if (! empty($filters['search'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('invoice_number', 'ilike', "%{$filters['search']}%");
            });
        }

        $result = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return $result->toArray();
    }

    public function getByCustomer(string $customerId, int $perPage = 15): array
    {
        return InvoiceModel::query()->with('items')
            ->where('customer_id', $customerId)
            ->orderBy('created_at', 'desc')
            ->paginate($perPage)
            ->toArray();
    }

    public function getSalesReport(\DateTimeImmutable $from, \DateTimeImmutable $to): array
    {
        $result = DB::connection('tenant')
            ->table('invoices')
            ->where('status', 'confirmed')
            ->whereBetween('invoice_date', [$from->format('Y-m-d'), $to->format('Y-m-d')])
            ->selectRaw('
                COUNT(*) as total_invoices,
                SUM(subtotal) as total_subtotal,
                SUM(vat_amount) as total_vat,
                SUM(discount_amount) as total_discount,
                SUM(total) as total_sales
            ')
            ->first();

        return $result ? (array) $result : [];
    }

    private function toDomain(InvoiceModel $model): Invoice
    {
        $invoice = new Invoice(
            id: $model->id,
            invoiceNumber: $model->invoice_number,
            customerId: $model->customer_id,
            type: $model->type,
            subtotal: (float) $model->subtotal,
            vatAmount: (float) $model->vat_amount,
            discountAmount: (float) $model->discount_amount,
            total: (float) $model->total,
            status: $model->status,
            notes: $model->notes,
            warehouseId: $model->warehouse_id,
            createdBy: $model->created_by,
            invoiceDate: $model->invoice_date instanceof \DateTimeInterface ? \DateTimeImmutable::createFromInterface($model->invoice_date) : new \DateTimeImmutable($model->invoice_date),
            zatcaQrCode: $model->zatca_qr_code,
            zatcaXml: $model->zatca_xml,
            zatcaHash: $model->zatca_hash,
            zatcaUuid: $model->zatca_uuid,
            zatcaStatus: $model->zatca_status ?? 'pending',
            zatcaErrorMessage: $model->zatca_error_message,
            salesChannelId: $model->sales_channel_id,
            salesChannelName: $model->sales_channel_name,
            pricingAdjustmentType: $model->pricing_adjustment_type,
            pricingAdjustmentValue: $model->pricing_adjustment_value ? (float) $model->pricing_adjustment_value : null,
            dueDate: $model->due_date ? new \DateTimeImmutable($model->due_date->toDateTimeString()) : null,
            internalNotes: $model->internal_notes,
            referenceNo: $model->reference_no,
            paidAmount: (float) $model->paid_amount,
            salespersonId: $model->salesperson_id,
            costCenterId: $model->cost_center_id,
            currencyId: $model->currency_id,
            exchangeRate: $model->exchange_rate ? (float) $model->exchange_rate : null,
            paymentMethod: $model->payment_method,
        );

        $items = $model->items->map(function ($itemModel) {
            return new InvoiceItem(
                id: $itemModel->id,
                invoiceId: $itemModel->invoice_id,
                productId: $itemModel->product_id,
                quantity: (float) $itemModel->quantity,
                unitPrice: (float) $itemModel->unit_price,
                discountPercent: (float) $itemModel->discount_percent,
                vatRate: (float) $itemModel->vat_rate,
                productName: $itemModel->product?->name,
                baseUnitPrice: $itemModel->base_unit_price ? (float) $itemModel->base_unit_price : null,
                adjustedUnitPrice: $itemModel->adjusted_unit_price ? (float) $itemModel->adjusted_unit_price : null,
                adjustmentAmount: $itemModel->adjustment_amount ? (float) $itemModel->adjustment_amount : null,
                coreChargeApplied: (bool) $itemModel->core_charge_applied,
                coreChargeAmount: (float) $itemModel->core_charge_amount,
            );
        })->toArray();

        $invoice->setItems($items);

        return $invoice;
    }
}
