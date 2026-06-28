<?php

declare(strict_types=1);

namespace App\Domain\Sales\Services;

use App\Domain\Inventory\Services\InventoryValuationService;
use App\Infrastructure\Eloquent\Models\SalesReturnModel;

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
            // Restore physical stock. recordMovement() handles the warehouse_products row
            // (firstOrCreate + quantity update) itself, so we must NOT also bump quantity here —
            // doing both double-counted returned stock.
            if ($item->condition === 'good') {
                $this->inventoryValuationService->recordMovement(
                    $item->product_id,
                    $salesReturn->warehouse_id,
                    (float) $item->quantity,
                    (float) ($item->cost_price ?? $item->unit_price),
                    'return',
                    $salesReturn->id,
                    $userId
                );
            } else {
                // Damaged goods: log 'in' then 'out' for quarantine. The stock_ledger enum only
                // allows purchase/sale/transfer/adjustment/return — 'sales_return'/'damaged_goods'
                // violated the constraint and made every real sales return fail at the DB layer.
                $this->inventoryValuationService->recordMovement(
                    $item->product_id,
                    $salesReturn->warehouse_id,
                    (float) $item->quantity,
                    (float) ($item->cost_price ?? $item->unit_price),
                    'return',
                    $salesReturn->id,
                    $userId
                );

                $this->inventoryValuationService->recordMovement(
                    $item->product_id,
                    $salesReturn->warehouse_id,
                    -(float) $item->quantity,
                    (float) ($item->cost_price ?? $item->unit_price),
                    'adjustment',
                    $salesReturn->id,
                    $userId
                );
            }
        }
    }
}
