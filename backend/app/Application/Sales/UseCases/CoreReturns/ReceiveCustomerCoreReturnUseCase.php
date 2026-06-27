<?php

declare(strict_types=1);

namespace App\Application\Sales\UseCases\CoreReturns;

use App\Infrastructure\Eloquent\Models\CustomerCoreReturnModel;
use App\Infrastructure\Eloquent\Models\WarehouseProductModel;
use App\Infrastructure\Eloquent\Models\StockMovementModel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ReceiveCustomerCoreReturnUseCase
{
    public function execute(string $coreReturnId, string $tenantId): void
    {
        DB::connection('tenant')->transaction(function () use ($coreReturnId, $tenantId) {
            $coreReturn = CustomerCoreReturnModel::query()
                ->where('tenant_id', $tenantId)
                ->with('items')
                ->lockForUpdate()
                ->findOrFail($coreReturnId);

            if ($coreReturn->status !== 'draft') {
                throw new \DomainException('Only draft core returns can be marked as received.');
            }

            $warehouseId = $coreReturn->warehouse_id;

            foreach ($coreReturn->items as $item) {
                // Add the returned core back into warehouse core inventory
                $stock = WarehouseProductModel::query()
                    ->where('warehouse_id', $warehouseId)
                    ->where('product_id', $item->product_id)
                    ->lockForUpdate()
                    ->first();

                if ($stock) {
                    $stock->core_quantity = ($stock->core_quantity ?? 0) + $item->quantity;
                    $stock->save();
                } else {
                    WarehouseProductModel::query()->create([
                        'id'            => Str::uuid()->toString(),
                        'warehouse_id'  => $warehouseId,
                        'product_id'    => $item->product_id,
                        'core_quantity' => $item->quantity,
                        'quantity'      => 0,
                    ]);
                }

                StockMovementModel::query()->create([
                    'id'             => Str::uuid()->toString(),
                    'tenant_id'      => $tenantId,
                    'product_id'     => $item->product_id,
                    'warehouse_id'   => $warehouseId,
                    'type'           => 'in',
                    'quantity'       => $item->quantity,
                    'cost_per_unit'  => $item->core_value,
                    'reference_type' => 'customer_core_return',
                    'reference_id'   => $coreReturn->id,
                    'created_at'     => now(),
                    'updated_at'     => now(),
                ]);
            }

            $coreReturn->status      = 'received';
            $coreReturn->received_at = now();
            $coreReturn->save();
        });
    }
}
