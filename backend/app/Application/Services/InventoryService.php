<?php

declare(strict_types=1);

namespace App\Application\Services;

use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\StockMovementModel;
use App\Infrastructure\Eloquent\Models\StocktakeModel;

class InventoryService
{
    /**
     * Adjust stock for a product safely.
     *
     * @param  float  $quantity  The quantity to adjust (positive or negative)
     * @param  string  $mode  'add', 'subtract', 'delta' (delta respects the sign of quantity)
     */
    public function adjustProductStock(string $tenantId, string $productId, float $quantity, string $mode): void
    {
        $product = ProductModel::query()->where('tenant_id', $tenantId)->lockForUpdate()->find($productId);
        if (! $product) {
            return;
        }

        match ($mode) {
            'add' => $product->increment('stock_quantity', abs($quantity)),
            'subtract' => $product->decrement('stock_quantity', abs($quantity)),
            'delta' => $product->increment('stock_quantity', $quantity),
            default => null,
        };
    }

    /**
     * Log a stock movement
     */
    public function logMovement(string $tenantId, string $productId, ?string $warehouseId, string $type, float $quantity, ?float $unitCost, string $referenceType, ?string $referenceId, ?string $notes, ?string $userId): StockMovementModel
    {
        if ($referenceType !== 'stocktake') {
            $this->checkStocktakeFreeze($tenantId, $warehouseId, $productId);
        }

        return StockMovementModel::query()->create([
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

    /**
     * Check if there's an active frozen stocktake preventing movements.
     */
    protected function checkStocktakeFreeze(string $tenantId, ?string $warehouseId, string $productId): void
    {
        if (!$warehouseId) return;

        // Check if there is an active frozen stocktake for this warehouse
        $frozenStocktake = StocktakeModel::query()
            ->where('tenant_id', $tenantId)
            ->where('warehouse_id', $warehouseId)
            ->where('is_frozen', true)
            ->whereIn('status', ['counting', 'review'])
            ->first();

        if ($frozenStocktake) {
            // If it's a partial stocktake (category limited), check if this product is in the category
            if ($frozenStocktake->category_id) {
                $product = ProductModel::query()->where('tenant_id', $tenantId)->find($productId);
                if ($product && $product->category_id !== $frozenStocktake->category_id) {
                    return; // Product not in the frozen category
                }
            }
            
            // If it's a cycle count limited by specific items, we'd need to check stocktake_items.
            // For simplicity and safety, if a warehouse is frozen, we check if the item is in the stocktake.
            $isItemInStocktake = $frozenStocktake->items()->where('product_id', $productId)->exists();
            if ($isItemInStocktake || $frozenStocktake->type === 'full') {
                throw new \Exception("Inventory movement is temporarily frozen for this product due to an active stocktake ({$frozenStocktake->reference_number}).");
            }
        }
    }
}
