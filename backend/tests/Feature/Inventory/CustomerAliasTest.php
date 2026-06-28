<?php

declare(strict_types=1);

namespace Tests\Feature\Inventory;

use App\Infrastructure\Eloquent\Models\CustomerModel;
use App\Infrastructure\Eloquent\Models\ProductModel;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * The product customer-aliases tab (ProductAliasesTab) lists and deletes
 * customer-specific print names. The GET and DELETE endpoints were missing
 * (404) while only POST existed — this covers the now-added routes.
 */
class CustomerAliasTest extends TestCase
{
    public function test_list_create_and_delete_a_customer_alias(): void
    {
        $this->actingAsAuthenticatedUser();

        $product = ProductModel::create([
            'id' => Str::uuid(), 'name' => 'Brake Pad', 'name_ar' => 'تيل',
            'sku' => 'SKU-'.Str::random(6), 'barcode' => (string) random_int(100000000, 999999999),
            'cost_price' => 10, 'sell_price' => 20, 'is_active' => true,
        ]);
        $customer = CustomerModel::create([
            'id' => Str::uuid(), 'name' => 'Garage X', 'balance' => 0, 'is_active' => true,
        ]);

        // Empty to start.
        $this->getJson("/api/inventory/products/{$product->id}/customer-aliases")
            ->assertStatus(200)
            ->assertJsonCount(0, 'data');

        // Create one (existing endpoint).
        $this->postJson("/api/inventory/products/{$product->id}/customer-aliases", [
            'customer_id' => $customer->id,
            'alias_name' => 'Special Name for X',
        ])->assertStatus(201);

        // List returns it, shaped with the customer name.
        $list = $this->getJson("/api/inventory/products/{$product->id}/customer-aliases");
        $list->assertStatus(200)->assertJsonCount(1, 'data');
        $alias = $list->json('data.0');
        $this->assertSame('Special Name for X', $alias['alias_name']);
        $this->assertSame('Garage X', $alias['customer']['name']);

        // Delete it.
        $this->deleteJson("/api/inventory/products/{$product->id}/customer-aliases/{$alias['id']}")
            ->assertStatus(200);

        $this->getJson("/api/inventory/products/{$product->id}/customer-aliases")
            ->assertStatus(200)
            ->assertJsonCount(0, 'data');
    }

    public function test_deleting_an_unknown_customer_alias_returns_404(): void
    {
        $this->actingAsAuthenticatedUser();

        $product = ProductModel::create([
            'id' => Str::uuid(), 'name' => 'Filter', 'name_ar' => 'فلتر',
            'sku' => 'SKU-'.Str::random(6), 'barcode' => (string) random_int(100000000, 999999999),
            'cost_price' => 5, 'sell_price' => 10, 'is_active' => true,
        ]);

        $this->deleteJson("/api/inventory/products/{$product->id}/customer-aliases/00000000-0000-4000-8000-000000000abc")
            ->assertStatus(404);
    }
}
