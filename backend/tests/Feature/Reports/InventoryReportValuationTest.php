<?php

declare(strict_types=1);

namespace Tests\Feature\Reports;

use App\Application\Reports\Services\ReportingService;
use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\WarehouseModel;
use App\Infrastructure\Eloquent\Models\WarehouseProductModel;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * The inventory report used to query products.stock_quantity / products.price —
 * columns that do not exist — so its try/catch silently returned a valuation of
 * 0 and an empty low-stock list. This proves it now reads real stock from
 * warehouse_products and computes a correct valuation.
 */
class InventoryReportValuationTest extends TestCase
{
    private const TENANT_ID = '00000000-0000-0000-0000-000000000001';

    public function test_report_computes_valuation_from_warehouse_stock_and_flags_low_items(): void
    {
        $this->actingAsAuthenticatedUser();

        $warehouse = WarehouseModel::create([
            'id' => Str::uuid(), 'name' => 'Main WH', 'code' => 'WH-INV-'.Str::random(4), 'is_active' => true,
        ]);

        $healthy = ProductModel::create([
            'id' => Str::uuid(), 'name' => 'Healthy Stock', 'name_ar' => 'مخزون جيد',
            'sku' => 'SKU-'.Str::random(6), 'barcode' => (string) random_int(100000000, 999999999),
            'cost_price' => 50, 'sell_price' => 100, 'stock_alert_level' => 5, 'is_active' => true,
        ]);
        $low = ProductModel::create([
            'id' => Str::uuid(), 'name' => 'Low Stock', 'name_ar' => 'مخزون منخفض',
            'sku' => 'SKU-'.Str::random(6), 'barcode' => (string) random_int(100000000, 999999999),
            'cost_price' => 20, 'sell_price' => 40, 'stock_alert_level' => 10, 'is_active' => true,
        ]);

        WarehouseProductModel::create([
            'warehouse_id' => $warehouse->id, 'product_id' => $healthy->id, 'quantity' => 10, 'average_cost' => 50,
        ]); // 10 × 50 = 500, qty 10 > alert 5 → not low
        WarehouseProductModel::create([
            'warehouse_id' => $warehouse->id, 'product_id' => $low->id, 'quantity' => 3, 'average_cost' => 20,
        ]); // 3 × 20 = 60, qty 3 <= alert 10 → low

        $report = (new ReportingService(self::TENANT_ID))->getInventoryReport();

        $this->assertEqualsWithDelta(560.0, (float) $report['estimated_inventory_value'], 0.001,
            'valuation must be Σ(qty × average_cost) = 500 + 60');
        $this->assertGreaterThan(0, (float) $report['estimated_inventory_value'], 'valuation must not silently be 0');

        $lowIds = collect($report['low_stock_alerts'])->pluck('id')->all();
        $this->assertContains($low->id, $lowIds, 'the under-alert product must be flagged low');
        $this->assertNotContains($healthy->id, $lowIds, 'the healthy product must not be flagged low');
    }
}
