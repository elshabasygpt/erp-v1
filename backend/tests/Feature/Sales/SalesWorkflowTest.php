<?php

namespace Tests\Feature\Sales;

use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\WarehouseModel;
use App\Infrastructure\Eloquent\Models\WarehouseProductModel;
use Illuminate\Support\Str;
use Tests\TestCase;

class SalesWorkflowTest extends TestCase
{
    public function test_confirmed_invoice_deducts_stock()
    {
        $this->actingAsAuthenticatedUser();

        $warehouse = WarehouseModel::create([
            'id' => Str::uuid(),
            'name' => 'Main Warehouse',
            'code' => 'WH01',
            'is_active' => true,
        ]);

        $product = ProductModel::create([
            'id' => Str::uuid(),
            'name' => 'Test Product', 'name_ar' => 'Test Product', 'name_en' => 'Test Product',
            'sku' => 'SKU-1',
            'barcode' => '123',
            'type' => 'standard',
            'cost_price' => 50,
            'price' => 100,
            'is_active' => true,
        ]);

        WarehouseProductModel::create([
            'warehouse_id' => $warehouse->id,
            'product_id' => $product->id,
            'quantity' => 10,
            'average_cost' => 50,
        ]);

        $payload = [
            'type' => 'cash',
            'status' => 'confirmed',
            'warehouse_id' => $warehouse->id,
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 2,
                    'unit_price' => 100,
                    'tax_rate' => 15,
                ],
            ],
            'notes' => 'Test POS Invoice',
        ];

        $response = $this->postJson('/api/sales/invoices', $payload);

        if ($response->status() !== 201) {
            dump($response->json());
        }
        $response->assertStatus(201);

        $this->assertDatabaseHas('warehouse_products', [
            'warehouse_id' => $warehouse->id,
            'product_id' => $product->id,
            'quantity' => 8, // 10 - 2 = 8
        ]);

        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $product->id,
            'warehouse_id' => $warehouse->id,
            'type' => 'out',
            'quantity' => 2,
        ]);
    }
}
