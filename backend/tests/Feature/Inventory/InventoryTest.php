<?php

namespace Tests\Feature\Inventory;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\WarehouseModel;
use App\Infrastructure\Eloquent\Models\BranchModel;

class InventoryTest extends TestCase
{
    public function test_can_list_products(): void
    {
        dump(getcwd());
        dump(database_path('migrations/central'));
        dump(glob(database_path('migrations/central') . '/*_*.php'));
        $this->actingAsAuthenticatedUser();

        $response = $this->getJson('/api/inventory/products');

        $response->assertStatus(200)
                 ->assertJsonStructure(['data']);
    }

    public function test_can_create_product(): void
    {
        $this->actingAsAuthenticatedUser();

        $response = $this->postJson('/api/inventory/products', [
            'name'          => 'منتج تجريبي',
            'sku'           => 'SKU-TEST-001',
            'barcode'       => '1234567890',
            'price'         => 100.00,
            'cost'          => 60.00,
            'stock'         => 50,
            'sell_price'    => 150,
            'min_stock'     => 5,
            'unit'          => 'piece',
        ]);

        if ($response->status() !== 201) {
            dump($response->json());
        }
        $response->assertStatus(201)
                 ->assertJsonPath('data.name', 'منتج تجريبي');
    }

    public function test_can_show_product(): void
    {
        $this->actingAsAuthenticatedUser();

        $product = ProductModel::factory()->create([]);

        $response = $this->getJson("/api/inventory/products/{$product->id}");

        $response->assertStatus(200);
    }

    public function test_can_update_product(): void
    {
        $this->actingAsAuthenticatedUser();

        $product = ProductModel::factory()->create([]);

        $response = $this->putJson("/api/inventory/products/{$product->id}", [
            'name'  => 'منتج محدّث',
            'price' => 150.00,
        ]);

        $response->assertStatus(200);
    }

    public function test_can_delete_product(): void
    {
        $this->actingAsAuthenticatedUser();

        $product = ProductModel::factory()->create([]);

        $response = $this->deleteJson("/api/inventory/products/{$product->id}");

        $response->assertStatus(200);
    }

    public function test_can_search_products_by_barcode(): void
    {
        $this->actingAsAuthenticatedUser();

        $response = $this->getJson('/api/inventory/products/barcode/1234567890');

        $response->assertStatus(200);
    }

    public function test_can_list_warehouses(): void
    {
        $this->actingAsAuthenticatedUser();

        $response = $this->getJson('/api/inventory/warehouses');

        $response->assertStatus(200)
                 ->assertJsonStructure(['data']);
    }

    public function test_can_create_warehouse(): void
    {
        $this->actingAsAuthenticatedUser();

        $response = $this->postJson('/api/inventory/warehouses', [
            'name'     => 'مستودع رئيسي',
            'location' => 'الرياض',
        ]);

        $response->assertStatus(201);
    }

    public function test_can_list_stock_movements(): void
    {
        $this->actingAsAuthenticatedUser();

        $response = $this->getJson('/api/inventory/movements');

        $response->assertStatus(200)
                 ->assertJsonStructure(['data']);
    }

    public function test_can_create_stock_adjustment(): void
    {
        $this->actingAsAuthenticatedUser();

        $product   = ProductModel::factory()->create([]);
        $warehouse = WarehouseModel::factory()->create([]);

        $response = $this->postJson('/api/inventory/adjustments', [
            'warehouse_id' => $warehouse->id,
            'notes'        => 'جرد دوري',
            'items'        => [
                [
                    'product_id'   => $product->id,
                    'quantity'     => 10,
                    'reason'       => 'count_adjustment',
                ],
            ],
        ]);

        $response->assertStatus(201);
    }

    public function test_cannot_access_inventory_without_auth(): void
    {
        $response = $this->getJson('/api/inventory/products');
        $response->assertStatus(401);
    }
}
