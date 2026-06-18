<?php

declare(strict_types=1);

namespace App\Domain\Sales\Services;

use App\Infrastructure\Eloquent\Models\SalesOrderModel;
use App\Infrastructure\Eloquent\Models\WarehouseProductModel;
use DomainException;
use Illuminate\Support\Facades\DB;

class SalesOrderService
{
    /**
     * Cancels a sales order and releases reserved stock.
     */
    public function cancelOrder(string $tenantId, string $orderId): SalesOrderModel
    {
        $salesOrder = SalesOrderModel::query()->where('tenant_id', $tenantId)->with('items')->find($orderId);

        if (! $salesOrder) {
            throw new DomainException('Sales Order not found');
        }

        if (in_array($salesOrder->status, ['fulfilled', 'cancelled'])) {
            throw new DomainException('Cannot cancel a fulfilled or already cancelled sales order.');
        }

        DB::beginTransaction();
        try {
            foreach ($salesOrder->items as $item) {
                $unfulfilledQty = $item->quantity - $item->fulfilled_quantity;
                if ($unfulfilledQty > 0) {
                    $wp = WarehouseProductModel::query()->where('warehouse_id', $salesOrder->warehouse_id)
                        ->where('product_id', $item->product_id)
                        ->lockForUpdate()
                        ->first();

                    if ($wp) {
                        $wp->reserved_quantity = max(0, $wp->reserved_quantity - $unfulfilledQty);
                        $wp->save();
                    }
                }
            }

            $salesOrder->status = 'cancelled';
            $salesOrder->save();

            DB::commit();

            return $salesOrder;
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }
}
