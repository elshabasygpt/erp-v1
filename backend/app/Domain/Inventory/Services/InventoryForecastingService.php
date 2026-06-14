<?php

declare(strict_types=1);

namespace App\Domain\Inventory\Services;

use App\Infrastructure\Eloquent\Models\InvoiceItemModel;
use App\Infrastructure\Eloquent\Models\WarehouseProductModel;
use Carbon\Carbon;

class InventoryForecastingService
{
    /**
     * Get products that are forecasted to run out in <= $thresholdDays based on 30-day velocity.
     *
     * @param int $thresholdDays The day threshold to flag a warning
     * @return array
     */
    public function getLowStockForecasts(int $thresholdDays = 10): array
    {
        $thirtyDaysAgo = Carbon::now()->subDays(30);

        // Group invoice items from last 30 days by product to calculate total quantity sold
        // Only confirmed invoices ideally, but checking all for simplicity
        $salesVelocity = InvoiceItemModel::whereHas('invoice', function ($q) use ($thirtyDaysAgo) {
            $q->where('status', 'confirmed')
              ->where('invoice_date', '>=', $thirtyDaysAgo);
        })
        ->selectRaw('product_id, SUM(quantity) as total_sold_30_days')
        ->groupBy('product_id')
        ->get()
        ->keyBy('product_id');

        // Fetch current stock from warehouse_products
        // Grouping across warehouses for total stock
        $currentStocks = WarehouseProductModel::with('product')
            ->selectRaw('product_id, SUM(quantity) as total_stock')
            ->groupBy('product_id')
            ->get();

        $forecasts = [];

        foreach ($currentStocks as $stockData) {
            $productId = $stockData->product_id;
            $product = $stockData->product;
            
            if (!$product || !$product->is_active) {
                continue;
            }

            $totalSold = $salesVelocity->has($productId) ? (float) $salesVelocity[$productId]->total_sold_30_days : 0;
            $dailyVelocity = $totalSold / 30.0;
            $currentStock = (float) $stockData->total_stock;

            // If it's selling and stock is low
            if ($dailyVelocity > 0) {
                $daysToEmpty = $currentStock / $dailyVelocity;

                if ($daysToEmpty <= $thresholdDays) {
                    $forecasts[] = [
                        'product_id' => $productId,
                        'name' => $product->name,
                        'name_ar' => $product->name_ar,
                        'sku' => $product->sku,
                        'current_stock' => $currentStock,
                        'daily_velocity' => round($dailyVelocity, 2),
                        'days_to_empty' => round($daysToEmpty, 1),
                        'suggested_reorder_qty' => round($dailyVelocity * 30), // Buy for 30 days
                    ];
                }
            } elseif ($currentStock <= $product->stock_alert_level && $currentStock < 10) {
                // If it isn't selling recently but stock is universally low, tag it as 0 days
                $forecasts[] = [
                    'product_id' => $productId,
                    'name' => $product->name,
                    'name_ar' => $product->name_ar,
                    'sku' => $product->sku,
                    'current_stock' => $currentStock,
                    'daily_velocity' => 0,
                    'days_to_empty' => 0,
                    'suggested_reorder_qty' => max(30, $product->stock_alert_level * 2), // Default bulk purchase
                ];
            }
        }

        // Sort by days_to_empty ascending
        usort($forecasts, fn($a, $b) => $a['days_to_empty'] <=> $b['days_to_empty']);

        return $forecasts;
    }
}
