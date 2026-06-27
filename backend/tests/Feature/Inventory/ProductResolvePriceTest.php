<?php

namespace Tests\Feature\Inventory;

use App\Infrastructure\Eloquent\Models\CustomerModel;
use App\Infrastructure\Eloquent\Models\ProductModel;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProductResolvePriceTest extends TestCase
{
    private function makeProduct(): ProductModel
    {
        return ProductModel::create([
            'id' => Str::uuid(), 'name' => 'Oil Filter', 'name_ar' => 'فلتر زيت',
            'sku' => 'SKU-'.Str::random(6), 'cost_price' => 50,
            'sell_price' => 100, 'wholesale_price' => 80, 'semi_wholesale_price' => 90,
            'is_active' => true,
        ]);
    }

    public function test_vip_customer_gets_wholesale_price()
    {
        $this->actingAsAuthenticatedUser();
        $product = $this->makeProduct();
        $customer = CustomerModel::create(['id' => Str::uuid(), 'name' => 'VIP Garage', 'segment' => 'VIP', 'is_active' => true]);

        $response = $this->getJson("/api/inventory/products/{$product->id}/resolve-price?customer_id={$customer->id}");

        $response->assertStatus(200);
        $this->assertEquals(80, $response->json('data.unit_price'));
        $this->assertEquals('VIP', $response->json('data.tier'));
    }

    public function test_gold_customer_gets_semi_wholesale_price()
    {
        $this->actingAsAuthenticatedUser();
        $product = $this->makeProduct();
        $customer = CustomerModel::create(['id' => Str::uuid(), 'name' => 'Gold Garage', 'segment' => 'Gold', 'is_active' => true]);

        $response = $this->getJson("/api/inventory/products/{$product->id}/resolve-price?customer_id={$customer->id}");

        $response->assertStatus(200);
        $this->assertEquals(90, $response->json('data.unit_price'));
        $this->assertEquals('Gold', $response->json('data.tier'));
    }

    public function test_regular_customer_gets_standard_price()
    {
        $this->actingAsAuthenticatedUser();
        $product = $this->makeProduct();
        $customer = CustomerModel::create(['id' => Str::uuid(), 'name' => 'Regular Garage', 'segment' => 'Regular', 'is_active' => true]);

        $response = $this->getJson("/api/inventory/products/{$product->id}/resolve-price?customer_id={$customer->id}");

        $response->assertStatus(200);
        $this->assertEquals(100, $response->json('data.unit_price'));
        $this->assertEquals('standard', $response->json('data.tier'));
    }

    public function test_no_customer_gets_standard_price()
    {
        $this->actingAsAuthenticatedUser();
        $product = $this->makeProduct();

        $response = $this->getJson("/api/inventory/products/{$product->id}/resolve-price");

        $response->assertStatus(200);
        $this->assertEquals(100, $response->json('data.unit_price'));
    }
}
