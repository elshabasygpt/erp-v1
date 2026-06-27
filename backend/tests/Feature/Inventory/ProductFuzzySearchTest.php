<?php

namespace Tests\Feature\Inventory;

use App\Infrastructure\Eloquent\Models\ProductModel;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProductFuzzySearchTest extends TestCase
{
    private function makeProduct(): ProductModel
    {
        return ProductModel::create([
            'id' => Str::uuid(),
            'name' => 'Front Brake Pad A4', 'name_ar' => 'تيل فرامل أمامي A4',
            'sku' => 'SKU-'.Str::random(6),
            'barcode' => (string) random_int(100000000, 999999999),
            'cost_price' => 50, 'sell_price' => 100, 'is_active' => true,
        ]);
    }

    public function test_exact_substring_search_does_not_use_fuzzy_fallback()
    {
        $this->actingAsAuthenticatedUser();
        $product = $this->makeProduct();

        $response = $this->getJson('/api/inventory/products/search?q='.urlencode('تيل فرا'));
        $response->assertStatus(200);
        $this->assertFalse($response->json('meta.fuzzy'));
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals($product->id, $response->json('data.0.id'));
    }

    public function test_fuzzy_fallback_tolerates_a_stray_space_that_breaks_substring_matching()
    {
        $this->actingAsAuthenticatedUser();
        $product = $this->makeProduct();

        // A stray space breaks the literal substring "فرامل" — exact search finds nothing.
        $exact = $this->getJson('/api/inventory/products/search?q='.urlencode('تيل فرا ل').'&allow_fuzzy=0');
        $exact->assertStatus(200);
        $this->assertCount(0, $exact->json('data'));

        // With fuzzy fallback (default), the tokens "تيل" and "فرا" still both
        // match the product, so it's found and flagged as an approximate result.
        $fuzzy = $this->getJson('/api/inventory/products/search?q='.urlencode('تيل فرا ل'));
        $fuzzy->assertStatus(200);
        $this->assertTrue($fuzzy->json('meta.fuzzy'));
        $this->assertCount(1, $fuzzy->json('data'));
        $this->assertEquals($product->id, $fuzzy->json('data.0.id'));
    }

    public function test_fuzzy_fallback_never_triggers_when_no_words_are_long_enough()
    {
        $this->actingAsAuthenticatedUser();
        $this->makeProduct();

        // A single character that isn't even a substring of anything, and is
        // too short (<2 chars) to ever qualify as a fuzzy token.
        $response = $this->getJson('/api/inventory/products/search?q='.urlencode('ث'));
        $response->assertStatus(200);
        $this->assertCount(0, $response->json('data'));
        $this->assertFalse($response->json('meta.fuzzy'));
    }
}
