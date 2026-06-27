<?php

namespace Tests\Feature\Inventory;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class ProductImportVirusScanPathTest extends TestCase
{
    protected function tearDown(): void
    {
        $path = storage_path('app/private/imports');
        if (is_dir($path)) {
            foreach (glob($path.'/*') as $file) {
                @unlink($file);
            }
        }

        parent::tearDown();
    }

    public function test_import_no_longer_fails_the_virus_scan_path_check()
    {
        // Regression test: the controller used to hand-build
        // storage_path('app/'.$path) for the virus-scan existence check,
        // but Laravel 11's default 'local' disk root is
        // storage_path('app/private'), not storage_path('app') — so the
        // check always failed with "File not found for virus scanning,"
        // making every real import attempt fail unconditionally.
        $this->actingAsAuthenticatedUser();
        Queue::fake();

        $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
        $spreadsheet->getActiveSheet()->setCellValue('A1', 'product_name');
        $tempPath = tempnam(sys_get_temp_dir(), 'xlsx').'.xlsx';
        (new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet))->save($tempPath);

        $file = new UploadedFile($tempPath, 'products.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true);

        $response = $this->postJson('/api/inventory/products/import', ['file' => $file]);

        @unlink($tempPath);

        $response->assertStatus(202);
        $response->assertJsonMissing(['message' => 'Failed to queue import: File not found for virus scanning.']);
    }
}
