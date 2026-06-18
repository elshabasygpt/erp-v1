<?php

namespace Tests\Feature;

use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\UserModel;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProductImageTest extends TestCase
{
    private UserModel $user;

    protected function setUp(): void
    {
        parent::setUp();
        if (!extension_loaded('fileinfo')) {
            $this->markTestSkipped('The fileinfo extension is not available.');
        }
        $this->user = $this->actingAsAuthenticatedUser();
    }

    private function createFakePng(): UploadedFile
    {
        // Hexadecimal string of a valid 1x1 transparent PNG image
        $pngHex = '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c48f0000000d49444154789c63000100000500010d0a2db40000000049454e44ae426082';
        $tempFile = tempnam(sys_get_temp_dir(), 'test_img');
        file_put_contents($tempFile, hex2bin($pngHex));

        return new UploadedFile(
            $tempFile,
            'test_image.png',
            'image/png',
            null,
            true // test mode
        );
    }

    public function test_upload_image_successfully()
    {
        Storage::fake('public');

        $file = $this->createFakePng();

        $response = $this->actingAs($this->user)
            ->withHeader('X-Tenant-ID', 'test.example.com')
            ->postJson('/api/inventory/products/upload-image', [
                'image' => $file,
            ]);

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'success',
            'data' => [
                'image_url',
            ],
            'message',
        ]);

        $url = $response->json('data.image_url');
        $this->assertStringContainsString('/uploads/products/', $url);

        // Check file exists in target public path
        $filename = basename($url);
        $this->assertFileExists(public_path('uploads/products/'.$filename));

        // Clean up uploaded file
        @unlink(public_path('uploads/products/'.$filename));
    }

    public function test_upload_image_validation_fails_for_invalid_type()
    {
        $file = UploadedFile::fake()->create('document.pdf', 500, 'application/pdf');

        $response = $this->actingAs($this->user)
            ->withHeader('X-Tenant-ID', 'test.example.com')
            ->postJson('/api/inventory/products/upload-image', [
                'image' => $file,
            ]);

        $response->assertStatus(422); // Validation error
    }

    public function test_create_product_with_image_url()
    {
        $response = $this->actingAs($this->user)
            ->withHeader('X-Tenant-ID', 'test.example.com')
            ->postJson('/api/inventory/products', [
                'sku' => 'PROD-IMAGE-123',
                'name' => 'Image Product', 'name_ar' => 'Image Product',
                'name_ar' => 'منتج الصورة',
                'selling_price' => 150.00,
                'purchase_price' => 100.00,
                'tax_rate' => 15.0,
                'image_url' => 'http://localhost:8000/uploads/products/sample.jpg',
                'stock_alert_level' => 5,
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('products', [
            'sku' => 'PROD-IMAGE-123',
            'image_url' => 'http://localhost:8000/uploads/products/sample.jpg',
        ], 'tenant');
    }

    public function test_update_product_image_url()
    {
        $product = ProductModel::create([
            'id' => Str::uuid()->toString(),
            'sku' => 'PROD-UPDATE-123',
            'name' => 'Update Product', 'name_ar' => 'Update Product',
            'name_ar' => 'تحديث المنتج',
            'sell_price' => 100,
            'cost_price' => 70,
            'vat_rate' => 15,
            'stock_alert_level' => 5,
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->user)
            ->withHeader('X-Tenant-ID', 'test.example.com')
            ->putJson("/api/inventory/products/{$product->id}", [
                'name' => 'Updated Product Name', 'name_ar' => 'Updated Product Name',
                'selling_price' => 120.00,
                'image_url' => 'http://localhost:8000/uploads/products/new-image.jpg',
            ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'name' => 'Updated Product Name', 'name_ar' => 'Updated Product Name',
            'image_url' => 'http://localhost:8000/uploads/products/new-image.jpg',
        ], 'tenant');
    }
}
