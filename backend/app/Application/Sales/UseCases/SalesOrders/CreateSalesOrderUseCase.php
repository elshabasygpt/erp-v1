<?php

declare(strict_types=1);

namespace App\Application\Sales\UseCases\SalesOrders;

use App\Application\Sales\DTOs\CreateSalesOrderDTO;
use App\Infrastructure\Eloquent\Models\SalesOrderItemModel;
use App\Infrastructure\Eloquent\Models\SalesOrderModel;
use App\Infrastructure\Eloquent\Models\WarehouseProductModel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class CreateSalesOrderUseCase
{
    public function execute(CreateSalesOrderDTO $dto, string $userId): SalesOrderModel
    {
        return DB::transaction(function () use ($dto, $userId) {

            $subtotal = 0;
            $vatAmount = 0;

            $itemsData = [];
            foreach ($dto->items as $item) {
                $qty = (float) $item['quantity'];
                $price = (float) $item['unit_price'];
                $vatRate = (float) ($item['vat_rate'] ?? 15);

                $lineSubtotal = $qty * $price;
                $lineVat = $lineSubtotal * ($vatRate / 100);
                $lineTotal = $lineSubtotal + $lineVat;

                $subtotal += $lineSubtotal;
                $vatAmount += $lineVat;

                $itemsData[] = [
                    'id' => Str::uuid()->toString(),
                    'product_id' => $item['product_id'],
                    'quantity' => $qty,
                    'fulfilled_quantity' => 0,
                    'unit_price' => $price,
                    'vat_rate' => $vatRate,
                    'total' => $lineTotal,
                ];

                // 1. Reserve Inventory (check if available stock = quantity - reserved_quantity)
                $wp = WarehouseProductModel::query()->where('warehouse_id', $dto->warehouseId)
                    ->where('product_id', $item['product_id'])
                    ->lockForUpdate()
                    ->first();

                if (! $wp) {
                    throw new \DomainException("Product {$item['product_id']} not found in warehouse.");
                }

                $available = $wp->quantity - $wp->reserved_quantity;
                if ($available < $qty) {
                    throw new \DomainException("Insufficient available stock for product {$item['product_id']}. Available: {$available}, Requested: {$qty}");
                }

                // Increment reserved quantity
                $wp->reserved_quantity += $qty;
                $wp->save();
            }

            $total = $subtotal + $vatAmount;

            $salesOrder = SalesOrderModel::query()->create([
                'id' => Str::uuid()->toString(),
                'so_number' => 'SO-'.date('YmdHis').rand(10, 99),
                'quotation_id' => $dto->quotationId,
                'customer_id' => $dto->customerId,
                'warehouse_id' => $dto->warehouseId,
                'issue_date' => now(),
                'delivery_date' => $dto->deliveryDate,
                'subtotal' => $subtotal,
                'vat_amount' => $vatAmount,
                'total' => $total,
                'status' => $dto->status,
                'notes' => $dto->notes,
                'created_by' => $userId,
            ]);

            foreach ($itemsData as $itemData) {
                $itemData['sales_order_id'] = $salesOrder->id;
                SalesOrderItemModel::query()->create($itemData);
            }

            return $salesOrder->load('items');
        });
    }
}
