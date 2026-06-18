<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API;

use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\CustomerModel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class DataImportExportController extends BaseTenantController
{
    private array $supportedEntities = ['products', 'customers'];

    /**
     * Download a CSV template for the requested entity.
     */
    public function downloadTemplate(Request $request)
    {
        $entity = $request->query('entity');

        if (!in_array($entity, $this->supportedEntities)) {
            return response()->json(['error' => 'Entity not supported'], 400);
        }

        $headers = [];
        if ($entity === 'products') {
            $headers = ['name', 'name_ar', 'sku', 'barcode', 'description', 'price', 'cost'];
        } elseif ($entity === 'customers') {
            $headers = ['name', 'email', 'phone', 'vat_number', 'address'];
        }

        $callback = function () use ($headers) {
            $file = fopen('php://output', 'w');
            fputcsv($file, $headers);
            fclose($file);
        };

        return response()->stream($callback, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $entity . '_template.csv"',
        ]);
    }

    /**
     * Export data to CSV.
     */
    public function exportData(Request $request)
    {
        $entity = $request->query('entity');
        $tenantId = $this->getTenantId($request);

        if (!in_array($entity, $this->supportedEntities)) {
            return response()->json(['error' => 'Entity not supported'], 400);
        }

        $callback = function () use ($entity, $tenantId) {
            $file = fopen('php://output', 'w');

            if ($entity === 'products') {
                fputcsv($file, ['id', 'name', 'name_ar', 'sku', 'barcode', 'price', 'cost']);
                ProductModel::query()
                    ->where(['tenant_id' => $tenantId])
                    ->select(['id', 'name', 'name_ar', 'sku', 'barcode', 'sell_price as price', 'cost_price as cost'])
                    ->toBase() // Skip Eloquent Hydration for high performance
                    ->orderBy('id')
                    ->chunk(1000, function ($products) use ($file) {
                        foreach ($products as $product) {
                            fputcsv($file, (array) $product);
                        }
                    });
            } elseif ($entity === 'customers') {
                fputcsv($file, ['id', 'name', 'email', 'phone', 'vat_number', 'address']);
                CustomerModel::query()
                    ->where(['tenant_id' => $tenantId])
                    ->select(['id', 'name', 'email', 'phone', 'tax_number as vat_number', 'address'])
                    ->toBase()
                    ->orderBy('id')
                    ->chunk(1000, function ($customers) use ($file) {
                        foreach ($customers as $customer) {
                            fputcsv($file, (array) $customer);
                        }
                    });
            }

            fclose($file);
        };

        return response()->stream($callback, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $entity . '_export_' . date('Y_m_d_H_i') . '.csv"',
        ]);
    }

    /**
     * Bulk Import Data from CSV.
     */
    public function importData(Request $request): JsonResponse
    {
        set_time_limit(0); // Prevent timeout for large files

        $request->validate([
            'entity' => 'required|in:products,customers',
            'file' => 'required|file|mimes:csv,txt|max:10240', // 10MB limit
        ]);

        $entity = $request->input('entity');
        $tenantId = $this->getTenantId($request);
        $file = $request->file('file');

        $stream = fopen($file->getRealPath(), 'r');
        $header = fgetcsv($stream); // Read headers

        if (!$header) {
            return $this->error('The CSV file is empty or improperly formatted.', 400);
        }

        $records = [];
        $batchSize = 1000; // Increased batch size for better throughput
        $insertedCount = 0;
        $now = now();

        DB::connection('tenant')->beginTransaction();

        try {
            while (($row = fgetcsv($stream)) !== false) {
                // Combine headers and rows
                if (count($header) !== count($row)) {
                    continue; // Skip malformed rows
                }
                $data = array_combine($header, $row);

                if ($entity === 'products') {
                    $productName = $data['name'] ?? 'Unknown Product';
                    $records[] = [
                        'id' => !empty($data['id']) ? $data['id'] : Str::uuid()->toString(),
                        'tenant_id' => $tenantId,
                        'name' => $productName,
                        'name_ar' => $data['name_ar'] ?? $productName,
                        'sku' => !empty($data['sku']) ? $data['sku'] : strtoupper(Str::random(8)),
                        'barcode' => !empty($data['barcode']) ? $data['barcode'] : null,
                        'description' => !empty($data['description']) ? $data['description'] : null,
                        'sell_price' => isset($data['price']) ? (float)$data['price'] : 0,
                        'cost_price' => isset($data['cost']) ? (float)$data['cost'] : 0,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];

                    if (count($records) >= $batchSize) {
                        ProductModel::query()->upsert($records, ['id'], ['name', 'name_ar', 'sku', 'barcode', 'description', 'sell_price', 'cost_price', 'updated_at']);
                        $insertedCount += count($records);
                        $records = [];
                    }
                } elseif ($entity === 'customers') {
                    $records[] = [
                        'id' => !empty($data['id']) ? $data['id'] : Str::uuid()->toString(),
                        'tenant_id' => $tenantId,
                        'name' => $data['name'] ?? 'Unknown Customer',
                        'email' => $data['email'] ?? null,
                        'phone' => $data['phone'] ?? null,
                        'tax_number' => $data['vat_number'] ?? null,
                        'address' => $data['address'] ?? null,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];

                    if (count($records) >= $batchSize) {
                        CustomerModel::query()->upsert($records, ['id'], ['name', 'email', 'phone', 'tax_number', 'address', 'updated_at']);
                        $insertedCount += count($records);
                        $records = [];
                    }
                }
            }

            // Insert remaining records
            if (count($records) > 0) {
                if ($entity === 'products') ProductModel::query()->upsert($records, ['id'], ['name', 'name_ar', 'sku', 'barcode', 'description', 'sell_price', 'cost_price', 'updated_at']);
                if ($entity === 'customers') CustomerModel::query()->upsert($records, ['id'], ['name', 'email', 'phone', 'tax_number', 'address', 'updated_at']);
                $insertedCount += count($records);
            }

            DB::connection('tenant')->commit();
            fclose($stream);

            return $this->success(null, "Successfully imported {$insertedCount} records.", 200);

        } catch (\Exception $e) {
            DB::connection('tenant')->rollBack();
            fclose($stream);
            return $this->error('Failed to import data: ' . $e->getMessage(), 500);
        }
    }
}
