<?php

namespace Tests\Feature\Inventory;

use App\Domain\Inventory\Imports\ProductImport;
use App\Infrastructure\Eloquent\Models\BrandModel;
use Illuminate\Support\Facades\Validator;
use Tests\TestCase;

class ProductImportNewBrandTest extends TestCase
{
    private function readPrivate(object $object, string $property)
    {
        $ref = new \ReflectionProperty($object, $property);
        $ref->setAccessible(true);

        return $ref->getValue($object);
    }

    private function makeRow(string $sku, string $brand): array
    {
        return [
            'sku' => $sku,
            'barcode' => null,
            'product_name' => 'Brake Pad',
            'arabic_name' => 'تيل فرامل',
            'sell_price' => '100',
            'cost_price' => '60',
            'brand' => $brand,
        ];
    }

    public function test_validation_no_longer_rejects_a_brand_that_does_not_exist_yet()
    {
        $this->actingAsAuthenticatedUser();
        $tenant = '00000000-0000-0000-0000-000000000001';

        $import = new ProductImport($tenant, '', 'create_update', false);
        $row = $this->makeRow('NEW-BRAND-SKU-1', 'Brand New Co');

        $validator = Validator::make($row, $import->rules());

        $this->assertTrue($validator->passes(), 'A row with a brand new to the system must pass validation so model() can auto-create it.');
    }

    public function test_model_auto_creates_a_brand_that_does_not_exist_yet()
    {
        $this->actingAsAuthenticatedUser();
        $tenant = '00000000-0000-0000-0000-000000000001';

        $this->assertDatabaseMissing('brands', ['name' => 'Auto Created Brand']);

        $import = new ProductImport($tenant, '', 'create_update', false);
        $import->model($this->makeRow('NEW-BRAND-SKU-2', 'Auto Created Brand'));

        $this->assertDatabaseHas('brands', ['tenant_id' => $tenant, 'name' => 'Auto Created Brand']);

        $pending = $this->readPrivate($import, 'pendingProducts');
        $this->assertCount(1, $pending);
        $this->assertNotNull($pending[0]['brand_id']);
    }

    public function test_dry_run_does_not_actually_create_the_brand()
    {
        $this->actingAsAuthenticatedUser();
        $tenant = '00000000-0000-0000-0000-000000000001';

        $import = new ProductImport($tenant, '', 'create_update', true);
        $import->model($this->makeRow('NEW-BRAND-SKU-3', 'Dry Run Only Brand'));

        $this->assertDatabaseMissing('brands', ['name' => 'Dry Run Only Brand']);
    }

    public function test_existing_brand_is_reused_not_duplicated()
    {
        $this->actingAsAuthenticatedUser();
        $tenant = '00000000-0000-0000-0000-000000000001';
        $brand = BrandModel::create(['id' => \Illuminate\Support\Str::uuid(), 'tenant_id' => $tenant, 'name' => 'Bosch']);

        $import = new ProductImport($tenant, '', 'create_update', false);
        $import->model($this->makeRow('NEW-BRAND-SKU-4', 'Bosch'));

        $this->assertEquals(1, BrandModel::where('tenant_id', $tenant)->where('name', 'Bosch')->count());

        $pending = $this->readPrivate($import, 'pendingProducts');
        $this->assertEquals($brand->id, $pending[0]['brand_id']);
    }
}
