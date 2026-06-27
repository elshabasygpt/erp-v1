<?php

namespace Tests\Feature\Sales;

use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\WarehouseModel;
use App\Infrastructure\Eloquent\Models\WarehouseProductModel;
use Illuminate\Support\Str;
use Tests\TestCase;

class PosShiftReconciliationTest extends TestCase
{
    private function makeWarehouseAndProduct(): array
    {
        $warehouse = WarehouseModel::create([
            'id' => Str::uuid(), 'name' => 'Main Warehouse', 'code' => 'WH01', 'is_active' => true,
        ]);
        $product = ProductModel::create([
            'id' => Str::uuid(), 'name' => 'Oil Filter', 'name_ar' => 'فلتر زيت',
            'sku' => 'SKU-'.Str::random(6), 'barcode' => (string) random_int(100000000, 999999999),
            'cost_price' => 20, 'sell_price' => 50, 'is_active' => true,
        ]);
        WarehouseProductModel::create([
            'warehouse_id' => $warehouse->id, 'product_id' => $product->id, 'quantity' => 50, 'average_cost' => 20,
        ]);

        return [$warehouse, $product];
    }

    private function confirmCashInvoice($warehouse, $product, float $price = 50): void
    {
        $this->postJson('/api/sales/invoices', [
            'type' => 'cash', 'status' => 'confirmed', 'warehouse_id' => $warehouse->id,
            'payment_method' => 'cash',
            'items' => [['product_id' => $product->id, 'quantity' => 1, 'unit_price' => $price, 'vat_rate' => 0]],
        ])->assertStatus(201);
    }

    public function test_shift_close_computes_expected_cash_and_zero_variance_when_counted_correctly()
    {
        $this->actingAsAuthenticatedUser();
        [$warehouse, $product] = $this->makeWarehouseAndProduct();

        $this->postJson('/api/sales/pos/shifts/open', ['opening_cash' => 100])->assertStatus(201);

        $this->confirmCashInvoice($warehouse, $product, 50);

        // Expected cash = 100 (opening) + 50 (cash sale) = 150.
        $response = $this->postJson('/api/sales/pos/shifts/close', ['closing_cash' => 150]);

        $response->assertStatus(200);
        $this->assertEquals(50, (float) $response->json('data.cash_sales'));
        $this->assertEquals(150, (float) $response->json('data.expected_cash'));
        $this->assertEquals(0, (float) $response->json('data.cash_variance'));
        $this->assertEquals('closed', $response->json('data.status'));
    }

    public function test_shift_close_reports_a_shortage_when_counted_cash_is_less_than_expected()
    {
        $this->actingAsAuthenticatedUser();
        [$warehouse, $product] = $this->makeWarehouseAndProduct();

        $this->postJson('/api/sales/pos/shifts/open', ['opening_cash' => 100])->assertStatus(201);
        $this->confirmCashInvoice($warehouse, $product, 50);

        // Counted 140 instead of the expected 150 -> a 10 shortage.
        $response = $this->postJson('/api/sales/pos/shifts/close', ['closing_cash' => 140]);

        $response->assertStatus(200);
        $this->assertEquals(-10, (float) $response->json('data.cash_variance'));
    }

    public function test_card_sales_are_tracked_separately_and_excluded_from_cash_variance()
    {
        $this->actingAsAuthenticatedUser();
        [$warehouse, $product] = $this->makeWarehouseAndProduct();

        $this->postJson('/api/sales/pos/shifts/open', ['opening_cash' => 100])->assertStatus(201);

        $this->postJson('/api/sales/invoices', [
            'type' => 'cash', 'status' => 'confirmed', 'warehouse_id' => $warehouse->id,
            'payment_method' => 'card',
            'items' => [['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 50, 'vat_rate' => 0]],
        ])->assertStatus(201);

        // No cash sales at all -> expected cash stays at the opening float.
        $response = $this->postJson('/api/sales/pos/shifts/close', ['closing_cash' => 100]);

        $response->assertStatus(200);
        $this->assertEquals(0, (float) $response->json('data.cash_sales'));
        $this->assertEquals(50, (float) $response->json('data.card_sales'));
        $this->assertEquals(100, (float) $response->json('data.expected_cash'));
        $this->assertEquals(0, (float) $response->json('data.cash_variance'));
    }
}
