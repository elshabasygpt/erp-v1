<?php

declare(strict_types=1);

namespace App\Domain\Sales\Services;

use App\Infrastructure\Eloquent\Models\SalesReturnModel;
use App\Infrastructure\Eloquent\Models\WarehouseProductModel;
use App\Domain\Inventory\Services\InventoryValuationService;
use Illuminate\Support\Str;
use DomainException;

class SalesReturnService
{
    public function __construct(
        private readonly InventoryValuationService $inventoryValuationService
    ) {}

    /**
     * Processes inventory restoration for a sales return.
     */
    public function processInventoryReturn(string $tenantId, SalesReturnModel $salesReturn, string $userId): void
    {
        foreach ($salesReturn->items as $item) {
            // Restore reserved stock if needed, or physical stock
            if ($item->condition === 'good') {
                $wp = WarehouseProductModel::firstOrCreate(
                    ['warehouse_id' => $salesReturn->warehouse_id, 'product_id' => $item->product_id],
                    ['id' => Str::uuid()->toString(), 'quantity' => 0, 'reserved_quantity' => 0]
                );

                $wp->quantity += $item->quantity;
                $wp->save();

                $this->inventoryValuationService->recordMovement(
                    $item->product_id,
                    $salesReturn->warehouse_id,
                    (float) $item->quantity,
                    (float) ($item->cost_price ?? $item->unit_price),
                    'sales_return',
                    $salesReturn->id,
                    $userId
                );
            } else {
                // Damaged goods: log 'in' then 'out' for quarantine
                $this->inventoryValuationService->recordMovement(
                    $item->product_id,
                    $salesReturn->warehouse_id,
                    (float) $item->quantity,
                    (float) ($item->cost_price ?? $item->unit_price),
                    'sales_return',
                    $salesReturn->id,
                    $userId
                );

                $this->inventoryValuationService->recordMovement(
                    $item->product_id,
                    $salesReturn->warehouse_id,
                    -(float) $item->quantity,
                    (float) ($item->cost_price ?? $item->unit_price),
                    'damaged_goods',
                    $salesReturn->id,
                    $userId
                );
            }
        }
    }
}
