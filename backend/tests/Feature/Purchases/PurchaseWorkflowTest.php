<?php

namespace Tests\Feature\Purchases;

use Tests\TestCase;
use App\Infrastructure\Eloquent\Models\UserModel;
use App\Infrastructure\Eloquent\Models\WarehouseModel;
use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\SupplierModel;
use Illuminate\Foundation\Testing\RefreshDatabase;

class PurchaseWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_confirmed_purchase_adds_stock()
    {
        $user = UserModel::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'name' => 'Admin',
            'email' => 'admin@test.com',
            'password' => bcrypt('password'),
        ]);

        $warehouse = WarehouseModel::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'name' => 'Main Warehouse',
            'code' => 'WH01',
            'is_active' => true,
        ]);

        $supplier = SupplierModel::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'name' => 'Test Supplier',
        ]);

        $product = ProductModel::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'name' => 'Test Product',
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
                ]
            ],
            'notes' => 'Test Purchase'
        ];

        $response = $this->actingAs($user, 'api')->postJson('/api/purchases/invoices', $payload);

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
