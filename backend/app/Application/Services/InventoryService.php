<?php

declare(strict_types=1);

namespace App\Application\Services;

use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\StockMovementModel;

class InventoryService
{
    /**
     * Adjust stock for a product safely.
     * 
     * @param string $tenantId
     * @param string $productId
     * @param float $quantity The quantity to adjust (positive or negative)
     * @param string $mode 'add', 'subtract', 'delta' (delta respects the sign of quantity)
     */
    public function adjustProductStock(string $tenantId, string $productId, float $quantity, string $mode): void
    {
        $product = ProductModel::where('tenant_id', $tenantId)->find($productId);
        if (!$product) return;

        match ($mode) {
            'add'      => $product->increment('stock_quantity', abs($quantity)),
            'subtract' => $product->decrement('stock_quantity', abs($quantity)),
            'delta'    => $product->increment('stock_quantity', $quantity),
            default    => null,
        };
    }

    /**
     * Log a stock movement
     */
    public function logMovement(string $tenantId, string $productId, ?string $warehouseId, string $type, float $quantity, ?float $unitCost, string $referenceType, ?string $referenceId, ?string $notes, ?string $userId): StockMovementModel
    {
        return StockMovementModel::create([
            'tenant_id' => $tenantId,
            'product_id' => $productId,
            'warehouse_id' => $warehouseId,
            'type' => $type,
            'quantity' => $quantity,
            'cost_per_unit' => $unitCost,
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
            'notes' => $notes,
            'created_by' => $userId,
        ]);
    }
}
