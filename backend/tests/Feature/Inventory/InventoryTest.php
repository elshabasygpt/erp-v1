<?php

namespace Tests\Feature\Inventory;

use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\WarehouseModel;
use Illuminate\Support\Str;
use Tests\TestCase;

class InventoryTest extends TestCase
{
    public function test_can_list_products(): void
    {
        $this->actingAsAuthenticatedUser();

        $response = $this->getJson('/api/inventory/products');

        $response->assertStatus(200)
            ->assertJsonStructure(['data']);
    }

    public function test_can_create_product(): void
    {
        $this->actingAsAuthenticatedUser();

        $response = $this->postJson('/api/inventory/products', [
            'name' => 'منتج تجريبي',
            'sku' => 'SKU-TEST-001',
            'barcode' => '1234567890',
            'selling_price' => 100.00,
            'purchase_price' => 60.00,
            'stock' => 50,
            'min_stock' => 5,
            'unit_of_measure' => 'piece',
        ]);

        if ($response->status() !== 201) {
            dump($response->json());
        }
        $response->assertStatus(201)
            ->assertJsonPath('data.name_ar', 'منتج تجريبي');
    }

    public function test_can_show_product(): void
    {
        $this->actingAsAuthenticatedUser();

        $product = ProductModel::factory()->create([]);

        $response = $this->getJson("/api/inventory/products/{$product->id}");

        if ($response->status() !== 200) {
            dump($response->json());
        }
        $response->assertStatus(200);
    }

    public function test_can_update_product(): void
    {
        $this->actingAsAuthenticatedUser();

        $product = ProductModel::factory()->create([]);

        $response = $this->putJson("/api/inventory/products/{$product->id}", [
            'name' => 'منتج محدّث',
            'selling_price' => 150.00,
        ]);

        if ($response->status() !== 200) {
            dump($response->json());
        }
        $response->assertStatus(200);
    }

    public function test_can_delete_product(): void
    {
        $this->actingAsAuthenticatedUser();

        $product = ProductModel::factory()->create([]);

        $response = $this->deleteJson("/api/inventory/products/{$product->id}");

        if ($response->status() !== 200) {
            dump($response->json());
        }
        $response->assertStatus(200);
    }

    public function test_can_search_products_by_barcode(): void
    {
        $this->actingAsAuthenticatedUser();
        ProductModel::factory()->create(['barcode' => '1234567890']);

        $response = $this->getJson('/api/inventory/products/barcode/1234567890');

        if ($response->status() !== 200) {
            dump($response->json());
        }
        $response->assertStatus(200);
    }

    public function test_can_list_warehouses(): void
    {
        $this->actingAsAuthenticatedUser();

        $response = $this->getJson('/api/inventory/warehouses');

        if ($response->status() !== 200) {
            dump($response->json());
        }
        $response->assertStatus(200)
            ->assertJsonStructure(['data']);
    }

    public function test_can_create_warehouse(): void
    {
        $this->actingAsAuthenticatedUser();
        $branchId = Str::uuid()->toString();
        \DB::connection('tenant')->table('branches')->insert([
            'id' => $branchId,
            'name' => 'Test Branch', 'name_ar' => 'Test Branch',
            'tenant_id' => '00000000-0000-0000-0000-000000000001',
        ]);
        $response = $this->postJson('/api/inventory/warehouses', [
            'name' => 'مستودع رئيسي',
            'location' => 'الرياض',
            'branch_id' => $branchId,
        ]);
        if ($response->status() !== 201) {
            dump($response->json());
        }
        $response->assertStatus(201);
    }

    public function test_can_list_stock_movements(): void
    {
        $this->actingAsAuthenticatedUser();

        $response = $this->getJson('/api/inventory/movements');

        if ($response->status() !== 200) {
            dump($response->json());
        }
        $response->assertStatus(200)
            ->assertJsonStructure(['data']);
    }

    public function test_can_create_stock_adjustment(): void
    {
        $this->actingAsAuthenticatedUser();

        $product = ProductModel::factory()->create([]);
        $warehouse = WarehouseModel::factory()->create([]);

        $response = $this->postJson('/api/inventory/adjustments', [
            'warehouse_id' => $warehouse->id,
            'notes' => 'جرد دوري',
            'type' => 'reconciliation',
            'date' => now()->toDateString(),
            'items' => [
                [
                    'product_id' => $product->id,
                    'actual_quantity' => 60,
                ],
            ],
        ]);

        if ($response->status() !== 201) {
            dump($response->json());
        }
        $response->assertStatus(201);
    }

    public function test_cannot_access_inventory_without_auth(): void
    {
        $response = $this->getJson('/api/inventory/products');
        $response->assertStatus(401);
    }
}
