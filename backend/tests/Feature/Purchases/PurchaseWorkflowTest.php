<?php

namespace Tests\Feature\Purchases;

use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\SupplierModel;
use App\Infrastructure\Eloquent\Models\WarehouseModel;
use Illuminate\Support\Str;
use Tests\TestCase;

class PurchaseWorkflowTest extends TestCase
{
    public function test_confirmed_purchase_adds_stock()
    {
        $this->actingAsAuthenticatedUser();

        $warehouse = WarehouseModel::create([
            'id' => Str::uuid(),
            'name' => 'Main Warehouse',
            'code' => 'WH01',
            'is_active' => true,
        ]);

        $supplier = SupplierModel::create([
            'id' => Str::uuid(),
            'name' => 'Test Supplier',
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

        $payload = [
            'supplier_id' => $supplier->id,
            'warehouse_id' => $warehouse->id,
            'issue_date' => now()->toDateString(),
            'status' => 'confirmed',
            'payment_type' => 'cash',
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 10,
                    'unit_price' => 45,
                    'tax_rate' => 15,
                ],
            ],
            'notes' => 'Test Purchase',
        ];

        $response = $this->postJson('/api/purchases/invoices', $payload);

        if ($response->status() !== 201) {
            dump($response->json());
        }
        $response->assertStatus(201);

        $this->assertDatabaseHas('warehouse_products', [
            'warehouse_id' => $warehouse->id,
            'product_id' => $product->id,
            'quantity' => 10,
        ]);

        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $product->id,
            'warehouse_id' => $warehouse->id,
            'type' => 'in',
            'quantity' => 10,
        ]);
    }
}
