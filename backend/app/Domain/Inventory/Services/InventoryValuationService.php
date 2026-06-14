<?php

declare(strict_types=1);

namespace App\Domain\Inventory\Services;

use App\Infrastructure\Eloquent\Models\Inventory\StockLedgerModel;
use App\Infrastructure\Eloquent\Models\WarehouseProductModel;
use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\StockMovementModel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;
use DomainException;

/**
 * InventoryValuationService
 *
 * Handles logic for inventory valuation (Moving Average Cost),
 * tracking stock ledgers, and reporting on valuation.
 */
class InventoryValuationService
{
    /**
     * Record a stock movement and recalculate the average cost.
     * Must be called within a database transaction.
     * 
     * @param string $productId
     * @param string $warehouseId
     * @param float $quantityChange Positive for incoming, negative for outgoing
     * @param float $unitCost The cost of the incoming items (required for incoming, ignored for outgoing)
     * @param string $transactionType 'purchase', 'sale', 'transfer', 'adjustment', 'return'
     * @param string|null $referenceId The ID of the transaction (invoice, purchase, etc.)
     * @param string|null $userId
     * @return float The average cost used/calculated for this transaction
     */
    public function recordMovement(
        string $productId,
        string $warehouseId,
        float $quantityChange,
        float $unitCost,
        string $transactionType,
        ?string $referenceId = null,
        ?string $userId = null
    ): float {
        // Lock the warehouse product row to prevent race conditions during cost calculation
        $wp = WarehouseProductModel::lockForUpdate()->firstOrCreate(
            ['warehouse_id' => $warehouseId, 'product_id' => $productId],
            ['id' => Str::uuid()->toString(), 'quantity' => 0, 'average_cost' => 0]
        );

        $oldQuantity = (float) $wp->quantity;
        $oldAverageCost = (float) $wp->average_cost;
        $oldTotalValue = $oldQuantity * $oldAverageCost;

        $newQuantity = $oldQuantity + $quantityChange;
        if ($newQuantity < 0) {
            throw new DomainException("Insufficient stock for product {$productId} in warehouse {$warehouseId}.");
        }

        $transactionTotalCost = 0;
        $newAverageCost = $oldAverageCost;

        if ($quantityChange > 0) {
            // Incoming Stock
            $transactionTotalCost = $quantityChange * $unitCost;
            $newTotalValue = $oldTotalValue + $transactionTotalCost;
            $newAverageCost = $newQuantity > 0 ? $newTotalValue / $newQuantity : 0;
            $wp->average_cost = $newAverageCost;
        } else {
            // Outgoing Stock (use existing average cost)
            $transactionTotalCost = abs($quantityChange) * $oldAverageCost; // Positive cost value
            // Average cost does not change on outgoing stock
        }

        $wp->quantity = $newQuantity;
        $wp->save();

        // Create Stock Ledger Entry
        StockLedgerModel::create([
            'id' => Str::uuid()->toString(),
            'product_id' => $productId,
            'warehouse_id' => $warehouseId,
            'transaction_date' => now()->toDateString(),
            'transaction_type' => $transactionType,
            'reference_id' => $referenceId,
            'quantity_change' => $quantityChange,
            'unit_cost' => $quantityChange > 0 ? $unitCost : $oldAverageCost,
            'total_cost' => $transactionTotalCost,
            'balance_quantity' => $newQuantity,
            'balance_value' => $newQuantity * $newAverageCost,
            'average_cost' => $newAverageCost,
            'created_by' => $userId,
        ]);

        // Create Stock Movement (for backward compatibility)
        StockMovementModel::create([
            'id' => Str::uuid()->toString(),
            'product_id' => $productId,
            'warehouse_id' => $warehouseId,
            'type' => $quantityChange > 0 ? 'in' : 'out',
            'quantity' => abs($quantityChange),
            'cost_per_unit' => $quantityChange > 0 ? $unitCost : $oldAverageCost,
            'reference_type' => $transactionType,
            'reference_id' => $referenceId,
            'created_by' => $userId,
        ]);

        return $quantityChange > 0 ? $newAverageCost : $oldAverageCost;
    }

    /**
     * Get the current valuation of all products across all warehouses.
     */
    public function getValuationReport(): array
    {
        $valuation = DB::connection('tenant')
            ->table('warehouse_products')
            ->join('products', 'warehouse_products.product_id', '=', 'products.id')
            ->join('warehouses', 'warehouse_products.warehouse_id', '=', 'warehouses.id')
            ->where('warehouse_products.quantity', '>', 0)
            ->select(
                'products.name as product_name',
                'products.sku',
                'warehouses.name as warehouse_name',
                'warehouse_products.quantity',
                'warehouse_products.average_cost',
                DB::raw('(warehouse_products.quantity * warehouse_products.average_cost) as total_value')
            )
            ->get();

        $totalValuation = $valuation->sum('total_value');

        return [
            'total_valuation' => $totalValuation,
            'items' => $valuation->toArray()
        ];
    }
}
