<?php

namespace Tests\Feature\Inventory;

use App\Domain\Inventory\Imports\ProductImport;
use App\Infrastructure\Eloquent\Models\DataImportModel;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Validators\Failure;
use Tests\TestCase;

class ProductImportFailureTrackingTest extends TestCase
{
    private function makeImportRecord(string $tenant): DataImportModel
    {
        return DataImportModel::create([
            'id' => Str::uuid()->toString(),
            'tenant_id' => $tenant,
            'import_type' => 'products',
            'file_name' => 'test.xlsx',
            'file_path' => 'imports/test.xlsx',
            'import_mode' => 'create_update',
            'status' => 'pending',
            'total_rows' => 0,
        ]);
    }

    public function test_failures_from_multiple_chunks_all_accumulate_without_overwriting_each_other()
    {
        $this->actingAsAuthenticatedUser();
        $tenant = '00000000-0000-0000-0000-000000000001';
        $importRecord = $this->makeImportRecord($tenant);

        $import = new ProductImport($tenant, $importRecord->id, 'create_update', false);

        // Simulate two separate chunk jobs each reporting their own failures
        // for the same import — this is the scenario that used to lose data
        // under concurrent workers (last save() wins, overwriting the other).
        $import->onFailure(new Failure(2, 'sku', ['SKU is required.'], ['sku' => '']));
        $import->onFailure(
            new Failure(15, 'sell_price', ['Sell price must be a number.'], ['sell_price' => 'abc']),
            new Failure(16, 'brand', ['Brand is invalid.'], ['brand' => ''])
        );

        $importRecord->refresh();

        $this->assertEquals(3, $importRecord->failed_row_count);
        $this->assertCount(3, $importRecord->failed_rows);

        $rows = collect($importRecord->failed_rows)->pluck('row')->all();
        $this->assertEqualsCanonicalizing([2, 15, 16], $rows);
    }

    public function test_onfailure_is_a_no_op_when_there_are_no_failures()
    {
        $this->actingAsAuthenticatedUser();
        $tenant = '00000000-0000-0000-0000-000000000001';
        $importRecord = $this->makeImportRecord($tenant);

        $import = new ProductImport($tenant, $importRecord->id, 'create_update', false);
        $import->onFailure();

        $importRecord->refresh();
        $this->assertEquals(0, $importRecord->failed_row_count);
        $this->assertNull($importRecord->failed_rows);
    }
}
