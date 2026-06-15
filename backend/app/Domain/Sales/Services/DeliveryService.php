<?php

declare(strict_types=1);

namespace App\Domain\Sales\Services;

use App\Infrastructure\Eloquent\Models\DeliveryModel;
use App\Infrastructure\Eloquent\Models\WarehouseProductModel;
use App\Application\Services\InventoryService;
use Illuminate\Support\Facades\DB;
use DomainException;

class DeliveryService
{
    public function __construct(
        private readonly InventoryService $inventoryService
    ) {}

    /**
     * Dispatches a delivery, reducing reserved stock and physical stock,
     * and creating stock movement logs.
     */
    public function dispatchDelivery(string $tenantId, string $deliveryId, string $userId): DeliveryModel
    {
        $delivery = DeliveryModel::where('tenant_id', $tenantId)->with('salesOrder.items')->find($deliveryId);

        if (!$delivery) {
            throw new DomainException("Delivery not found");
        }

        if ($delivery->status === 'dispatched' || $delivery->status === 'delivered') {
            throw new DomainException("Delivery is already dispatched or delivered.");
        }

        if ($delivery->order_type !== 'sales_order' || !$delivery->salesOrder) {
            throw new DomainException("Dispatch is currently only supported for Sales Orders.");
        }

        DB::beginTransaction();
        try {
            $order = $delivery->salesOrder;

            // Iterate over delivery items instead of full order items
            foreach ($delivery->items as $delItem) {
                // Find matching SO item
                $item = $order->items->firstWhere('product_id', $delItem->product_id);
                if (!$item) {
                    throw new DomainException("Product {$delItem->product_id} not found in Sales Order.");
                }

                $qtyToDispatch = $delItem->quantity;
                    $wp = WarehouseProductModel::where('warehouse_id', $order->warehouse_id)
                        ->where('product_id', $item->product_id)
                        ->lockForUpdate()
                        ->first();

                    if (!$wp) {
                        throw new DomainException("Product {$item->product_id} not found in warehouse.");
                    }

                if ($wp->reserved_quantity < $qtyToDispatch) {
                    throw new DomainException("Reserved quantity is less than dispatch quantity for product {$item->product_id}");
                }

                // Deduct reserved and physical stock
                $wp->reserved_quantity -= $qtyToDispatch;
                $wp->quantity -= $qtyToDispatch;
                $wp->save();

                // Update global stock
                $this->inventoryService->adjustProductStock($tenantId, $item->product_id, $qtyToDispatch, 'subtract');

                // Log movement
                $this->inventoryService->logMovement(
                    $tenantId,
                    $item->product_id,
                    $order->warehouse_id,
                    'out',
                    $qtyToDispatch,
                    $item->unit_price,
                    'delivery',
                    $delivery->id,
                    "Delivery dispatched for Sales Order {$order->so_number}",
                    $userId
                );

                // Update fulfilled quantity
                $item->fulfilled_quantity += $qtyToDispatch;
                $item->save();
            }

            $delivery->status = 'dispatched';
            $delivery->save();

            DB::commit();
            return $delivery;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Cancels a delivery and reverses stock movements if it was already dispatched.
     */
    public function cancelDelivery(string $tenantId, string $deliveryId, string $userId): DeliveryModel
    {
        $delivery = DeliveryModel::where('tenant_id', $tenantId)->with('salesOrder.items', 'items')->find($deliveryId);

        if (!$delivery) {
            throw new DomainException("Delivery not found");
        }

        if ($delivery->status === 'returned' || $delivery->status === 'cancelled') {
            throw new DomainException("Delivery is already cancelled or returned.");
        }

        DB::beginTransaction();
        try {
            $order = $delivery->salesOrder;

            // Only reverse stock if it was actually dispatched
            if (in_array($delivery->status, ['dispatched', 'out_for_delivery', 'delivered'])) {
                foreach ($delivery->items as $delItem) {
                    $item = $order->items->firstWhere('product_id', $delItem->product_id);
                    if ($item) {
                        $qtyToReverse = $delItem->quantity;

                        $wp = WarehouseProductModel::where('warehouse_id', $order->warehouse_id)
                            ->where('product_id', $item->product_id)
                            ->lockForUpdate()
                            ->first();

                        if ($wp) {
                            $wp->reserved_quantity += $qtyToReverse;
                            $wp->quantity += $qtyToReverse;
                            $wp->save();
                        }

                        // Update global stock
                        $this->inventoryService->adjustProductStock($tenantId, $item->product_id, $qtyToReverse, 'add');

                        // Log movement
                        $this->inventoryService->logMovement(
                            $tenantId,
                            $item->product_id,
                            $order->warehouse_id,
                            'in',
                            $qtyToReverse,
                            $item->unit_price,
                            'delivery_cancellation',
                            $delivery->id,
                            "Delivery cancelled for Sales Order {$order->so_number}",
                            $userId
                        );

                        // Update fulfilled quantity
                        $item->fulfilled_quantity = max(0, $item->fulfilled_quantity - $qtyToReverse);
                        $item->save();
                    }
                }
            }

            $delivery->status = 'returned'; // Using returned as terminal state for cancelled
            $delivery->save();

            DB::commit();
            return $delivery;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }
}
