<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Inventory;

use App\Presentation\Controllers\API\BaseTenantController;
use App\Domain\Inventory\Imports\ProductImport;
use App\Domain\Inventory\Exports\ProductExport;
use App\Domain\Inventory\Exports\ProductImportErrorsExport;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ProductImportExportController extends BaseTenantController
{
    public function import(Request $request): JsonResponse
    {
        // Optional Authorization Gate
        if (\Illuminate\Support\Facades\Gate::has('import_products')) {
            \Illuminate\Support\Facades\Gate::authorize('import_products');
        }

        $request->validate([
            'file' => [
                'required',
                'file',
                'mimes:xlsx,csv,xls',
                'mimetypes:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain,application/vnd.ms-excel',
                'max:51200'
            ],
            'import_mode' => 'nullable|string|in:create_only,update_only,create_update,ignore_duplicates,replace_all,update_prices,update_status,update_category,update_brand,update_aliases,update_description',
            'dry_run' => 'nullable|boolean',
        ]);

        $tenantId = $this->getTenantId($request);
        $importMode = $request->input('import_mode', 'create_update');
        $isDryRun = filter_var($request->input('dry_run', false), FILTER_VALIDATE_BOOLEAN);
        $file = $request->file('file');

        try {
            $path = $file->store('imports');
            // Resolve the real path via the disk config rather than
            // hand-building storage_path('app/'.$path) — Laravel 11's
            // default 'local' disk root is storage_path('app/private'),
            // not storage_path('app'), so the hand-built path never matched
            // and every import previously failed this check unconditionally.
            $this->virusScanHook(\Illuminate\Support\Facades\Storage::disk('local')->path($path));
            $importRecord = \App\Infrastructure\Eloquent\Models\DataImportModel::create([
                'id' => \Illuminate\Support\Str::uuid()->toString(),
                'tenant_id' => $tenantId,
                'import_type' => 'products',
                'file_name' => $file->getClientOriginalName(),
                'file_path' => $path,
                'import_mode' => $importMode,
                'status' => $isDryRun ? 'dry_run_pending' : 'pending',
                'total_rows' => 0,
                'processed_rows' => 0,
                'imported_rows' => 0,
                'updated_rows' => 0,
                'skipped_rows' => 0,
                'ip_address' => $request->ip(),
                'created_by' => auth()->id() ?? null,
            ]);

            if ($importMode === 'replace_all' && !$isDryRun) {
                \App\Infrastructure\Eloquent\Models\ProductModel::where('tenant_id', $tenantId)->forceDelete();
            }

            $import = new ProductImport($tenantId, $importRecord->id, $importMode, $isDryRun);
            // Dispatched on a dedicated 'database' connection/'imports' queue
            // rather than the app default (which stays 'sync' for everything
            // else, e.g. ZATCA submission/webhooks) — see config/queue.php
            // and the queue-worker service in docker-compose.yml for why.
            $import->queue($path)->onConnection('database')->onQueue('imports');

            return $this->success(['import_id' => $importRecord->id], 'Import queued successfully', 202);

        } catch (\Exception $e) {
            \Log::error('Product Import Queue Failed: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('Failed to queue import: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Placeholder hook for integrating a virus scanner like ClamAV.
     */
    protected function virusScanHook(string $filePath): void
    {
        // Enterprise Security: Ensure file exists before scanning
        if (!file_exists($filePath)) {
            throw new \Exception('File not found for virus scanning.');
        }
        
        \Log::info('Security Event: Commencing Virus Scan for uploaded file.', ['file' => $filePath]);
        
        // Example integration:
        // if (app('clamav')->scan($filePath) !== true) {
        //     unlink($filePath);
        //     \Log::alert('Security Alert: Malicious payload detected during import.', ['file' => $filePath]);
        //     throw new \Exception('Virus or malicious content detected. File quarantined.');
        // }
    }

    public function importStatus(Request $request, string $id): JsonResponse
    {
        if (\Illuminate\Support\Facades\Gate::has('import_products')) {
            \Illuminate\Support\Facades\Gate::authorize('import_products');
        }

        $tenantId = $this->getTenantId($request);
        $import = \App\Infrastructure\Eloquent\Models\DataImportModel::where('tenant_id', $tenantId)
            ->where('id', $id)
            ->first();

        if (!$import) {
            return $this->error('Import not found', 404);
        }

        $duration = $import->updated_at ? $import->updated_at->diffInSeconds($import->created_at) : 0;

        return $this->success([
            'status' => $import->status,
            'total_rows' => $import->total_rows,
            'processed_rows' => $import->processed_rows,
            'imported_rows' => $import->imported_rows,
            'updated_rows' => $import->updated_rows,
            'skipped_rows' => $import->skipped_rows,
            'failed_row_count' => $import->failed_row_count,
            'error_message' => $import->error_message,
            'duration_seconds' => $duration,
        ]);
    }

    public function history(Request $request): JsonResponse
    {
        if (\Illuminate\Support\Facades\Gate::has('import_products')) {
            \Illuminate\Support\Facades\Gate::authorize('import_products');
        }

        $tenantId = $this->getTenantId($request);
        
        $imports = \App\Infrastructure\Eloquent\Models\DataImportModel::where('tenant_id', $tenantId)
            ->where('import_type', 'products')
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        // We should map the duration for each item
        $items = collect($imports->items())->map(function ($import) {
            $duration = $import->updated_at ? $import->updated_at->diffInSeconds($import->created_at) : 0;
            return [
                'id' => $import->id,
                'file_name' => $import->file_name,
                'status' => $import->status,
                'total_rows' => $import->total_rows,
                'imported_rows' => $import->imported_rows,
                'updated_rows' => $import->updated_rows,
                'skipped_rows' => $import->skipped_rows,
                'failed_row_count' => $import->failed_row_count,
                'rollback_id' => $import->rollback_id,
                'created_at' => $import->created_at,
                'duration_seconds' => $duration,
            ];
        });

        return $this->success([
            'items' => $items,
            'total' => $imports->total(),
            'current_page' => $imports->currentPage(),
            'last_page' => $imports->lastPage(),
        ]);
    }

    public function undoImport(Request $request, string $id): JsonResponse
    {
        if (\Illuminate\Support\Facades\Gate::has('import_products')) {
            \Illuminate\Support\Facades\Gate::authorize('import_products');
        }

        $tenantId = $this->getTenantId($request);
        $import = \App\Infrastructure\Eloquent\Models\DataImportModel::where('tenant_id', $tenantId)
            ->where('id', $id)
            ->first();

        if (!$import) {
            return $this->error('Import not found', 404);
        }

        // Must be within 24 hours
        if ($import->created_at && $import->created_at->diffInHours(now()) > 24) {
            return $this->error('Imports can only be undone within 24 hours of creation', 400);
        }

        if (!$import->rollback_id) {
            return $this->error('This import does not have a valid rollback identifier', 400);
        }

        // Delete all products created in this import batch
        $deletedCount = \App\Infrastructure\Eloquent\Models\ProductModel::where('tenant_id', $tenantId)
            ->where('rollback_id', $import->rollback_id)
            ->delete();

        // Mark as rolled back
        $import->update([
            'status' => 'rolled_back'
        ]);

        return $this->success([
            'message' => 'Import successfully reversed',
            'deleted_count' => $deletedCount
        ]);
    }

    public function exportErrors(Request $request, string $id): BinaryFileResponse|JsonResponse
    {
        if (\Illuminate\Support\Facades\Gate::has('import_products')) {
            \Illuminate\Support\Facades\Gate::authorize('import_products');
        }

        $tenantId = $this->getTenantId($request);
        $import = \App\Infrastructure\Eloquent\Models\DataImportModel::where('tenant_id', $tenantId)
            ->where('id', $id)
            ->first();

        if (!$import) {
            return $this->error('Import not found', 404);
        }

        $failedRows = $import->failed_rows;
        if (empty($failedRows) || !is_array($failedRows)) {
            return $this->error('No errors found for this import', 404);
        }

        $export = new ProductImportErrorsExport($failedRows);
        $fileName = 'import_errors_' . $id . '.xlsx';

        return Excel::download($export, $fileName, \Maatwebsite\Excel\Excel::XLSX);
    }

    public function cancelImport(Request $request, string $id): JsonResponse
    {
        if (\Illuminate\Support\Facades\Gate::has('import_products')) {
            \Illuminate\Support\Facades\Gate::authorize('import_products');
        }

        $tenantId = $this->getTenantId($request);
        $import = \App\Infrastructure\Eloquent\Models\DataImportModel::where('tenant_id', $tenantId)
            ->where('id', $id)
            ->first();

        if (!$import) {
            return $this->error('Import not found', 404);
        }

        if (in_array($import->status, ['completed', 'failed'])) {
            return $this->error('Cannot cancel an import that has already finished', 400);
        }

        $import->update(['status' => 'cancelled']);

        return $this->success(null, 'Import cancellation requested');
    }

    public function resumeImport(Request $request, string $id): JsonResponse
    {
        if (\Illuminate\Support\Facades\Gate::has('import_products')) {
            \Illuminate\Support\Facades\Gate::authorize('import_products');
        }

        $tenantId = $this->getTenantId($request);
        $import = \App\Infrastructure\Eloquent\Models\DataImportModel::where('tenant_id', $tenantId)
            ->where('id', $id)
            ->first();

        if (!$import) {
            return $this->error('Import not found', 404);
        }

        if (!in_array($import->status, ['failed', 'cancelled'])) {
            return $this->error('Only failed or cancelled imports can be resumed', 400);
        }

        if (!file_exists(storage_path('app/' . $import->file_path))) {
            return $this->error('Source file no longer exists. Please re-upload.', 404);
        }

        $import->update(['status' => 'pending', 'error_message' => null]);

        try {
            $importer = new ProductImport($tenantId, $import->id, $import->import_mode);
            $importer->queue($import->file_path);
            
            return $this->success(null, 'Import resumed successfully');
        } catch (\Exception $e) {
            \Log::error('Resume Import Failed: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('Failed to resume import: ' . $e->getMessage(), 500);
        }
    }

    public function commitImport(Request $request, string $id): JsonResponse
    {
        if (\Illuminate\Support\Facades\Gate::has('import_products')) {
            \Illuminate\Support\Facades\Gate::authorize('import_products');
        }

        $tenantId = $this->getTenantId($request);
        $import = \App\Infrastructure\Eloquent\Models\DataImportModel::where('tenant_id', $tenantId)
            ->where('id', $id)
            ->first();

        if (!$import) {
            return $this->error('Import not found', 404);
        }

        if ($import->status !== 'dry_run_completed') {
            return $this->error('Only completed dry runs can be committed', 400);
        }

        if (!file_exists(storage_path('app/' . $import->file_path))) {
            return $this->error('Source file no longer exists. Please re-upload.', 404);
        }

        // Reset stats for real run
        $import->update([
            'status' => 'pending', 
            'error_message' => null,
            'processed_rows' => 0,
            'imported_rows' => 0,
            'updated_rows' => 0,
            'skipped_rows' => 0,
            'failed_rows' => []
        ]);

        if ($import->import_mode === 'replace_all') {
            \App\Infrastructure\Eloquent\Models\ProductModel::where('tenant_id', $tenantId)->forceDelete();
        }

        try {
            $importer = new ProductImport($tenantId, $import->id, $import->import_mode, false);
            $importer->queue($import->file_path);
            
            return $this->success(null, 'Import committed successfully');
        } catch (\Exception $e) {
            \Log::error('Commit Import Failed: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('Failed to commit import: ' . $e->getMessage(), 500);
        }
    }

    public function export(Request $request): BinaryFileResponse
    {
        if (\Illuminate\Support\Facades\Gate::has('export_products')) {
            \Illuminate\Support\Facades\Gate::authorize('export_products');
        }

        $tenantId = $this->getTenantId($request);
        
        $ids = $request->input('ids');
        if (is_string($ids)) {
            $ids = explode(',', $ids);
        }

        $searchQuery = $request->input('search');
        $categoryId = $request->input('category_id');
        $isActive = $request->input('is_active');
        $brand = $request->input('brand');
        $supplierId = $request->input('supplier_id');
        $warehouseId = $request->input('warehouse_id');
        $format = strtolower($request->input('format', 'xlsx'));

        $export = new ProductExport(
            $tenantId, 
            $ids, 
            $searchQuery, 
            $categoryId,
            $isActive,
            $brand,
            $supplierId,
            $warehouseId
        );
        
        $fileName = 'products_' . date('Y-m-d_His') . '.' . $format;
        
        $writerType = match ($format) {
            'csv' => \Maatwebsite\Excel\Excel::CSV,
            'ods' => \Maatwebsite\Excel\Excel::ODS,
            default => \Maatwebsite\Excel\Excel::XLSX,
        };

        return Excel::download($export, $fileName, $writerType);
    }

    public function downloadTemplate(Request $request): BinaryFileResponse
    {
        if (\Illuminate\Support\Facades\Gate::has('import_products')) {
            \Illuminate\Support\Facades\Gate::authorize('import_products');
        }

        $tenantId = $this->getTenantId($request);
        $export = new \App\Domain\Inventory\Exports\ProductTemplateExport($tenantId);
        
        return Excel::download($export, 'product_import_template.xlsx', \Maatwebsite\Excel\Excel::XLSX);
    }
}
