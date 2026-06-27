<?php

namespace Tests\Feature\Inventory;

use App\Infrastructure\Eloquent\Models\ProductModel;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProductFormFieldsTest extends TestCase
{
    public function test_profit_percent_and_discount_round_trip_through_create_and_read()
    {
        $this->actingAsAuthenticatedUser();

        $response = $this->postJson('/api/inventory/products', [
            'sku' => 'SKU-'.Str::random(8),
            'name' => 'Front Brake Pad',
            'selling_price' => 150,
            'purchase_price' => 100,
            'profit_percent' => 50,
            'default_discount_percent' => 10,
        ]);

        $response->assertStatus(201);
        $productId = $response->json('data.id');

        $this->assertDatabaseHas('products', [
            'id' => $productId,
            'profit_percent' => 50,
            'default_discount_percent' => 10,
        ]);

        $show = $this->getJson("/api/inventory/products/{$productId}");
        $show->assertStatus(200);
        $this->assertEquals(50, (float) $show->json('data.profit_percent'));
        $this->assertEquals(10, (float) $show->json('data.default_discount_percent'));
    }

    public function test_profit_percent_and_discount_round_trip_through_update()
    {
        $this->actingAsAuthenticatedUser();
        $product = ProductModel::create([
            'id' => Str::uuid(), 'name' => 'Oil Filter', 'name_ar' => 'فلتر زيت',
            'sku' => 'SKU-'.Str::random(8), 'cost_price' => 20, 'sell_price' => 30, 'is_active' => true,
        ]);

        $response = $this->putJson("/api/inventory/products/{$product->id}", [
            'selling_price' => 35,
            'profit_percent' => 75,
            'default_discount_percent' => 5,
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'profit_percent' => 75,
            'default_discount_percent' => 5,
        ]);
    }

    public function test_alternate_units_are_created_on_product_creation()
    {
        $this->actingAsAuthenticatedUser();

        $response = $this->postJson('/api/inventory/products', [
            'sku' => 'SKU-'.Str::random(8),
            'name' => 'Engine Oil 5L Can',
            'selling_price' => 100,
            'units' => [
                ['unit_name' => 'Box of 4', 'conversion_factor' => 4, 'sell_price' => 380],
            ],
        ]);

        $response->assertStatus(201);
        $productId = $response->json('data.id');

        $this->assertDatabaseHas('product_units', [
            'product_id' => $productId,
            'unit_name' => 'Box of 4',
            'conversion_factor' => 4,
        ]);
    }

    public function test_check_unique_reports_existing_barcode_and_excludes_self_on_edit()
    {
        $this->actingAsAuthenticatedUser();
        $product = ProductModel::create([
            'id' => Str::uuid(), 'name' => 'Spark Plug', 'name_ar' => 'بوجي',
            'sku' => 'SKU-'.Str::random(8), 'barcode' => '1234567890123',
            'cost_price' => 10, 'sell_price' => 20, 'is_active' => true,
        ]);

        // A different (hypothetical new) product checking the same barcode -> exists.
        $duplicate = $this->getJson('/api/inventory/products/check-unique?field=barcode&value=1234567890123');
        $duplicate->assertStatus(200);
        $this->assertTrue($duplicate->json('data.exists'));

        // The product itself, editing with its own barcode and excluding its own id -> not a duplicate.
        $self = $this->getJson("/api/inventory/products/check-unique?field=barcode&value=1234567890123&exclude_id={$product->id}");
        $self->assertStatus(200);
        $this->assertFalse($self->json('data.exists'));

        // A genuinely free barcode -> not a duplicate.
        $free = $this->getJson('/api/inventory/products/check-unique?field=barcode&value=9999999999999');
        $free->assertStatus(200);
        $this->assertFalse($free->json('data.exists'));
    }
}
