<?php

namespace Tests\Feature\Inventory;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class ProductImportQueueConnectionTest extends TestCase
{
    protected function tearDown(): void
    {
        // The controller's virus-scan hook checks the real filesystem path
        // (not the Storage facade), so this test writes a real temp file —
        // clean it up rather than leaving it on disk.
        $path = storage_path('app/private/imports');
        if (is_dir($path)) {
            foreach (glob($path.'/*') as $file) {
                @unlink($file);
            }
        }

        parent::tearDown();
    }

    public function test_import_is_dispatched_on_the_database_connection_not_the_app_default()
    {
        $this->actingAsAuthenticatedUser();
        Queue::fake();

        // UploadedFile::fake()->create() writes random bytes, not a real
        // zip/xlsx structure — Laravel-Excel's chunk planner opens the file
        // to count rows before it ever reaches the queue, so the upload
        // must be a real (if minimal) spreadsheet.
        $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setCellValue('A1', 'product_name');
        $sheet->setCellValue('B1', 'sell_price');
        $tempPath = tempnam(sys_get_temp_dir(), 'xlsx').'.xlsx';
        (new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet))->save($tempPath);

        $file = new UploadedFile($tempPath, 'products.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true);

        $response = $this->postJson('/api/inventory/products/import', [
            'file' => $file,
        ]);

        @unlink($tempPath);

        $response->assertStatus(202);

        // The app's global default queue connection stays 'sync' (so
        // ZATCA/webhook jobs dispatched elsewhere keep running inline,
        // unaffected by this change) — only this dispatch explicitly opts
        // into the real 'database' queue connection so it doesn't block
        // the HTTP request for large files.
        Queue::assertPushed(\Maatwebsite\Excel\Jobs\QueueImport::class, function ($job) {
            return $job->connection === 'database' && $job->queue === 'imports';
        });
    }
}
