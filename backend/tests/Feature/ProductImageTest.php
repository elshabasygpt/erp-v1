<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\RoleModel;
use App\Infrastructure\Eloquent\Models\UserModel;
use App\Infrastructure\Eloquent\Models\TenantModel;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class ProductImageTest extends TestCase
{
    private UserModel $user;
    private TenantModel $tenant;
    private string $centralDbPath;
    private string $tenantDbPath;

    protected function setUp(): void
    {
        parent::setUp();

        $this->centralDbPath = database_path('test_central.sqlite');
        $this->tenantDbPath = database_path('test_tenant.sqlite');

        // Ensure database files are fresh and clean
        if (file_exists($this->centralDbPath)) {
            @unlink($this->centralDbPath);
        }
        if (file_exists($this->tenantDbPath)) {
            @unlink($this->tenantDbPath);
        }

        touch($this->centralDbPath);
        touch($this->tenantDbPath);

        // Override database config for SQLite testing
        config([
            'database.default' => 'sqlite',
            'database.connections.sqlite' => [
                'driver' => 'sqlite',
                'database' => $this->centralDbPath,
                'prefix' => '',
            ],
            'database.connections.pgsql' => [
                'driver' => 'sqlite',
                'database' => $this->centralDbPath,
                'prefix' => '',
            ],
            'database.connections.tenant' => [
                'driver' => 'sqlite',
                'database' => $this->tenantDbPath,
                'prefix' => '',
            ]
        ]);

        // Purge any cached database connections to apply the configuration overrides immediately
        \Illuminate\Support\Facades\DB::purge('sqlite');
        \Illuminate\Support\Facades\DB::purge('pgsql');
        \Illuminate\Support\Facades\DB::purge('tenant');

        // Manually run migrations on our custom sqlite file databases
        $this->artisan('migrate', [
            '--database' => 'sqlite',
            '--path' => 'database/migrations/central',
            '--force' => true,
        ]);

        $this->artisan('migrate', [
            '--database' => 'tenant',
            '--path' => 'database/migrations/tenant',
            '--force' => true,
        ]);

        // Create tenant Central record
        $this->tenant = TenantModel::create([
            'id' => \Illuminate\Support\Str::uuid()->toString(),
            'name' => 'Test Tenant',
            'domain' => 'test-tenant',
            'database_name' => $this->tenantDbPath,
            'status' => 'active',
        ]);

        // Create standard roles & admin user to authenticate requests
        $role = RoleModel::create([
            'name' => 'Admin',
            'guard_name' => 'api',
        ]);

        $this->user = UserModel::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'name' => 'Test Admin',
            'email' => 'admin@test.com',
            'password' => bcrypt('password'),
            'role_id' => $role->id,
        ]);
    }

    protected function tearDown(): void
    {
        parent::tearDown();

        // Clean up database files
        if (file_exists($this->centralDbPath)) {
            @unlink($this->centralDbPath);
        }
        if (file_exists($this->tenantDbPath)) {
            @unlink($this->tenantDbPath);
        }
    }

    private function createFakePng(): UploadedFile
    {
        // Hexadecimal string of a valid 1x1 transparent PNG image
        $pngHex = "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c48f0000000d49444154789c63000100000500010d0a2db40000000049454e44ae426082";
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
            ->withHeader('X-Tenant-ID', $this->tenant->id)
            ->postJson('/api/inventory/products/upload-image', [
                'image' => $file,
            ]);

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'success',
            'data' => [
                'image_url'
            ],
            'message'
        ]);

        $url = $response->json('data.image_url');
        $this->assertStringContainsString('/uploads/products/', $url);

        // Check file exists in target public path
        $filename = basename($url);
        $this->assertFileExists(public_path('uploads/products/' . $filename));

        // Clean up uploaded file
        @unlink(public_path('uploads/products/' . $filename));
    }

    public function test_upload_image_validation_fails_for_invalid_type()
    {
        $file = UploadedFile::fake()->create('document.pdf', 500, 'application/pdf');

        $response = $this->actingAs($this->user)
            ->withHeader('X-Tenant-ID', $this->tenant->id)
            ->postJson('/api/inventory/products/upload-image', [
                'image' => $file,
            ]);

        $response->assertStatus(422); // Validation error
    }

    public function test_create_product_with_image_url()
    {
        $response = $this->actingAs($this->user)
            ->withHeader('X-Tenant-ID', $this->tenant->id)
            ->postJson('/api/inventory/products', [
                'sku' => 'PROD-IMAGE-123',
                'name' => 'Image Product',
                'name_ar' => 'منتج الصورة',
                'selling_price' => 150.00,
                'purchase_price' => 100.00,
                'tax_rate' => 15.0,
                'image_url' => 'http://localhost:8000/uploads/products/sample.jpg',
                'stock_alert_level' => 5,
            ]);

        $response->assertStatus(201);
        config(['database.connections.tenant.database' => $this->tenantDbPath]);
        \Illuminate\Support\Facades\DB::purge('tenant');
        $this->assertDatabaseHas('products', [
            'sku' => 'PROD-IMAGE-123',
            'image_url' => 'http://localhost:8000/uploads/products/sample.jpg',
        ], 'tenant');
    }

    public function test_update_product_image_url()
    {
        $product = ProductModel::create([
            'id' => \Illuminate\Support\Str::uuid()->toString(),
            'sku' => 'PROD-UPDATE-123',
            'name' => 'Update Product',
            'name_ar' => 'تحديث المنتج',
            'sell_price' => 100,
            'cost_price' => 70,
            'vat_rate' => 15,
            'stock_alert_level' => 5,
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->user)
            ->withHeader('X-Tenant-ID', $this->tenant->id)
            ->putJson('/api/inventory/products/' . $product->id, [
                'name' => 'Updated Product Name',
                'selling_price' => 120.00,
                'image_url' => 'http://localhost:8000/uploads/products/new-image.jpg',
            ]);

        $response->assertStatus(200);
        config(['database.connections.tenant.database' => $this->tenantDbPath]);
        \Illuminate\Support\Facades\DB::purge('tenant');
        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'name' => 'Updated Product Name',
            'image_url' => 'http://localhost:8000/uploads/products/new-image.jpg',
        ], 'tenant');
    }
}
