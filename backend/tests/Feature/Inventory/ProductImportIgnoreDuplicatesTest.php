<?php

namespace Tests\Feature\Inventory;

use App\Domain\Inventory\Imports\ProductImport;
use Tests\TestCase;

class ProductImportIgnoreDuplicatesTest extends TestCase
{
    private function readPrivate(object $object, string $property)
    {
        $ref = new \ReflectionProperty($object, $property);
        $ref->setAccessible(true);

        return $ref->getValue($object);
    }

    private function makeRow(string $sku): array
    {
        return [
            'sku' => $sku,
            'barcode' => null,
            'product_name' => 'Oil Filter',
            'arabic_name' => 'فلتر زيت',
            'sell_price' => '50',
            'cost_price' => '30',
        ];
    }

    public function test_ignore_duplicates_mode_skips_repeated_sku_within_the_same_file()
    {
        $this->actingAsAuthenticatedUser();
        $tenant = '00000000-0000-0000-0000-000000000001';

        $import = new ProductImport($tenant, '', 'ignore_duplicates', false);

        $import->model($this->makeRow('DUP-SKU-1'));
        $import->model($this->makeRow('DUP-SKU-1'));
        $import->model($this->makeRow('DUP-SKU-1'));

        // Only the first occurrence should have been queued for insertion.
        $this->assertCount(1, $this->readPrivate($import, 'pendingProducts'));
        $this->assertEquals(1, $this->readPrivate($import, 'importedCount'));
        $this->assertEquals(2, $this->readPrivate($import, 'skippedCount'));
    }

    public function test_default_mode_does_not_skip_repeated_sku_within_the_same_file()
    {
        $this->actingAsAuthenticatedUser();
        $tenant = '00000000-0000-0000-0000-000000000001';

        // Without ignore_duplicates, every occurrence of the same SKU within
        // the file is independently processed by model() — the existing
        // in-file duplicate guard lives in withValidator(), not model().
        $import = new ProductImport($tenant, '', 'create_update', false);

        $import->model($this->makeRow('DUP-SKU-2'));
        $import->model($this->makeRow('DUP-SKU-2'));

        $this->assertCount(2, $this->readPrivate($import, 'pendingProducts'));
    }

    public function test_ignore_duplicates_mode_still_processes_distinct_skus_normally()
    {
        $this->actingAsAuthenticatedUser();
        $tenant = '00000000-0000-0000-0000-000000000001';

        $import = new ProductImport($tenant, '', 'ignore_duplicates', false);

        $import->model($this->makeRow('DISTINCT-SKU-1'));
        $import->model($this->makeRow('DISTINCT-SKU-2'));

        $this->assertCount(2, $this->readPrivate($import, 'pendingProducts'));
        $this->assertEquals(0, $this->readPrivate($import, 'skippedCount'));
    }
}
