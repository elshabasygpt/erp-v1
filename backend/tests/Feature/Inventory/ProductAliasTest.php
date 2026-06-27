<?php

namespace Tests\Feature\Inventory;

use App\Infrastructure\Eloquent\Models\CustomerModel;
use App\Infrastructure\Eloquent\Models\ProductModel;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProductAliasTest extends TestCase
{
    private function makeProduct(string $name = 'Front Brake Pad A4'): ProductModel
    {
        return ProductModel::create([
            'id' => Str::uuid(),
            'name' => $name,
            'name_ar' => 'تيل فرامل أمامي A4',
            'sku' => 'SKU-'.Str::random(6),
            'barcode' => (string) random_int(100000000, 999999999),
            'cost_price' => 50,
            'sell_price' => 100,
            'is_active' => true,
        ]);
    }

    public function test_create_alias_and_search_returns_official_product()
    {
        $this->actingAsAuthenticatedUser();
        $product = $this->makeProduct();

        $response = $this->postJson("/api/inventory/products/{$product->id}/aliases", [
            'alias_name' => 'OEM 8K0698151',
        ]);
        $response->assertStatus(201);

        $this->assertDatabaseHas('product_aliases', [
            'product_id' => $product->id,
            'alias_name' => 'OEM 8K0698151',
        ]);

        $search = $this->getJson('/api/inventory/products/search?q=8K0698151');
        $search->assertStatus(200);
        $results = $search->json('data');

        $this->assertCount(1, $results, 'Searching by alias must return exactly one product (no duplicates).');
        $this->assertEquals($product->id, $results[0]['id']);
    }

    public function test_setting_default_print_alias_unsets_the_previous_default()
    {
        $this->actingAsAuthenticatedUser();
        $product = $this->makeProduct();

        $first = $this->postJson("/api/inventory/products/{$product->id}/aliases", [
            'alias_name' => 'Brake Pad A4', 'is_default_print' => true,
        ])->json('data');

        $second = $this->postJson("/api/inventory/products/{$product->id}/aliases", [
            'alias_name' => 'Bosch A4', 'is_default_print' => true,
        ])->json('data');

        $this->assertDatabaseHas('product_aliases', ['id' => $first['id'], 'is_default_print' => false]);
        $this->assertDatabaseHas('product_aliases', ['id' => $second['id'], 'is_default_print' => true]);
    }

    public function test_delete_alias_soft_deletes_it()
    {
        $this->actingAsAuthenticatedUser();
        $product = $this->makeProduct();

        $alias = $this->postJson("/api/inventory/products/{$product->id}/aliases", [
            'alias_name' => 'Brake Pad A4',
        ])->json('data');

        $this->deleteJson("/api/inventory/products/{$product->id}/aliases/{$alias['id']}")->assertStatus(200);

        $this->assertSoftDeleted('product_aliases', ['id' => $alias['id']]);
    }

    public function test_customer_alias_resolves_above_default_alias()
    {
        $this->actingAsAuthenticatedUser();
        $product = $this->makeProduct();
        $customer = CustomerModel::create(['id' => Str::uuid(), 'name' => 'Acme Garage', 'is_active' => true]);

        $this->postJson("/api/inventory/products/{$product->id}/aliases", [
            'alias_name' => 'Default Print Name', 'is_default_print' => true,
        ])->assertStatus(201);

        $this->postJson("/api/inventory/products/{$product->id}/customer-aliases", [
            'customer_id' => $customer->id, 'alias_name' => 'Acme Special Name',
        ])->assertStatus(201);

        $resolved = $this->getJson("/api/inventory/products/{$product->id}/resolve-alias?customer_id={$customer->id}");
        $resolved->assertStatus(200);
        $this->assertEquals('Acme Special Name', $resolved->json('data.printed_name'));

        // Without a customer, falls back to the default print alias.
        $resolvedNoCustomer = $this->getJson("/api/inventory/products/{$product->id}/resolve-alias");
        $this->assertEquals('Default Print Name', $resolvedNoCustomer->json('data.printed_name'));
    }

    public function test_official_product_is_never_duplicated_by_aliases()
    {
        $this->actingAsAuthenticatedUser();
        $product = $this->makeProduct();

        $this->postJson("/api/inventory/products/{$product->id}/aliases", ['alias_name' => 'Alias One'])->assertStatus(201);
        $this->postJson("/api/inventory/products/{$product->id}/aliases", ['alias_name' => 'Alias Two'])->assertStatus(201);

        $this->assertEquals(1, ProductModel::query()->where('name', $product->name)->count());
    }
}
