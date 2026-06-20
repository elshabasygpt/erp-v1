<?php

declare(strict_types=1);

namespace App\Application\Purchases\UseCases\CoreReturns;

use App\Infrastructure\Eloquent\Models\SupplierCoreReturnModel;
use App\Infrastructure\Eloquent\Models\WarehouseProductModel;
use App\Infrastructure\Eloquent\Models\StockMovementModel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ShipCoreReturnUseCase
{
    public function execute(string $coreReturnId, string $tenantId): void
    {
        DB::connection('tenant')->transaction(function () use ($coreReturnId, $tenantId) {
            $coreReturn = SupplierCoreReturnModel::query()
                ->where('tenant_id', $tenantId)
                ->with('items')
                ->lockForUpdate()
                ->findOrFail($coreReturnId);

            if ($coreReturn->status !== 'draft') {
                throw new \DomainException('Only draft core returns can be shipped.');
            }

            $warehouseId = $coreReturn->warehouse_id;

            foreach ($coreReturn->items as $item) {
                $stock = WarehouseProductModel::query()
                    ->where('warehouse_id', $warehouseId)
                    ->where('product_id', $item->product_id)
                    ->lockForUpdate()
                    ->first();

                if (! $stock || $stock->core_quantity < $item->quantity) {
                    throw new \DomainException("Insufficient core inventory for product ID: {$item->product_id}. Available: " . ($stock ? $stock->core_quantity : 0));
                }

                // Deduct from core quantity
                $stock->core_quantity -= $item->quantity;
                $stock->save();

                // Record stock movement (optional, but good for tracking)
                StockMovementModel::query()->create([
                    'id' => Str::uuid()->toString(),
                    'tenant_id' => $tenantId,
                    'product_id' => $item->product_id,
                    'warehouse_id' => $warehouseId,
                    'type' => 'out', // Core out
                    'quantity' => -$item->quantity,
                    'cost_per_unit' => $item->core_value,
                    'reference_type' => 'supplier_core_return',
                    'reference_id' => $coreReturn->id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            $coreReturn->status = 'shipped';
            $coreReturn->shipped_at = now();
            $coreReturn->save();
        });
    }
}
