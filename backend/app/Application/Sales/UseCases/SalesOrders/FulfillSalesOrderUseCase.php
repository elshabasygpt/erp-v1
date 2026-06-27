<?php

declare(strict_types=1);

namespace App\Application\Sales\UseCases\SalesOrders;

use App\Application\Sales\DTOs\CreateInvoiceDTO;
use App\Application\Sales\UseCases\CreateInvoiceUseCase;
use App\Domain\Sales\Entities\Invoice;
use App\Infrastructure\Eloquent\Models\SalesOrderModel;
use App\Infrastructure\Eloquent\Models\WarehouseProductModel;
use Illuminate\Support\Facades\DB;

final class FulfillSalesOrderUseCase
{
    public function __construct(
        private readonly CreateInvoiceUseCase $createInvoiceUseCase
    ) {}

    public function execute(string $salesOrderId, string $userId): Invoice
    {
        $defaultVatRate = (float) (DB::connection('tenant')
            ->table('tenant_settings')->where('key', 'tax_rate')->value('value') ?? 15);

        return DB::connection('tenant')->transaction(function () use ($salesOrderId, $userId, $defaultVatRate) {
            $salesOrder = SalesOrderModel::query()->with('items')->findOrFail($salesOrderId);

            if ($salesOrder->status === 'fulfilled') {
                throw new \DomainException('Sales order is already fulfilled.');
            }

            if ($salesOrder->status === 'cancelled') {
                throw new \DomainException('Cannot fulfill a cancelled sales order.');
            }

            $invoiceItems = [];
            foreach ($salesOrder->items as $item) {
                // Determine quantity to fulfill
                $qtyToFulfill = $item->quantity - $item->fulfilled_quantity;
                if ($qtyToFulfill <= 0) {
                    continue;
                }

                $invoiceItems[] = [
                    'product_id' => $item->product_id,
                    'quantity' => $qtyToFulfill,
                    'unit_price' => $item->unit_price,
                    'vat_rate' => $item->vat_rate,
                ];

                // 1. Release reserved stock (subtract from reserved_quantity)
                // 2. The CreateInvoiceUseCase will deduct the actual quantity.
                // We just need to remove the reservation lock here.
                $wp = WarehouseProductModel::query()->where('warehouse_id', $salesOrder->warehouse_id)
                    ->where('product_id', $item->product_id)
                    ->lockForUpdate()
                    ->first();

                if ($wp) {
                    $wp->reserved_quantity = max(0, $wp->reserved_quantity - $qtyToFulfill);
                    $wp->save();
                }

                $item->fulfilled_quantity += $qtyToFulfill;
                $item->save();
            }

            if (empty($invoiceItems)) {
                throw new \DomainException('No items available to fulfill.');
            }

            // Create Invoice
            $dto = CreateInvoiceDTO::fromRequest([
                'customer_id' => $salesOrder->customer_id,
                'warehouse_id' => $salesOrder->warehouse_id,
                'type' => 'credit', // Usually SOs become credit invoices
                'status' => 'confirmed',
                'items' => $invoiceItems,
                'reference_no' => $salesOrder->so_number,
                'salesperson_id' => $salesOrder->created_by,
            ], $defaultVatRate);

            $invoice = $this->createInvoiceUseCase->execute($dto, $userId);

            // Update SO status
            $salesOrder->status = 'fulfilled';
            $salesOrder->save();

            return $invoice;
        });
    }
}
