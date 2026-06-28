<?php

declare(strict_types=1);

namespace App\Domain\Inventory\Imports;

use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\CategoryModel;
use App\Infrastructure\Eloquent\Models\CustomerModel;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;
use Maatwebsite\Excel\Concerns\WithBatchInserts;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Maatwebsite\Excel\Concerns\WithStartRow;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Events\BeforeImport;
use Maatwebsite\Excel\Events\AfterImport;
use Maatwebsite\Excel\Events\AfterChunk;
use Maatwebsite\Excel\Events\ImportFailed;
use Illuminate\Contracts\Queue\ShouldQueue;
use Maatwebsite\Excel\Concerns\Importable;
use Maatwebsite\Excel\Concerns\SkipsOnFailure;
use Maatwebsite\Excel\Concerns\SkipsOnError;
use Maatwebsite\Excel\Concerns\SkipsFailures;
use Maatwebsite\Excel\Concerns\SkipsErrors;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProductImport implements ToModel, WithHeadingRow, WithStartRow, WithValidation, WithBatchInserts, WithChunkReading, SkipsOnFailure, SkipsOnError, WithEvents, ShouldQueue
{
    use Importable, SkipsFailures, SkipsErrors;

    public int $tries = 3;
    public int $backoff = 30;

    private string $tenantId;
    private string $importId;
    private array $categories = [];
    private array $units = [];
    private array $brands = [];
    private array $seenIdentifiers = [];
    private array $processedInFile = [];
    private array $pendingProducts = [];
    private array $pendingAliases = [];
    private array $pendingCustomerAliases = [];
    private array $customers = [];
    private string $importMode;
    private float $defaultVatRate = 15.0;
    private ?string $rollbackId = null;
    
    // Chunk Counters
    private int $importedCount = 0;
    private int $updatedCount = 0;
    private int $skippedCount = 0;
    private int $unchangedCount = 0;
    private int $startRow = 2;
    private bool $isDryRun;

    public function __construct(string $tenantId, string $importId = '', string $importMode = 'create_update', bool $isDryRun = false)
    {
        $this->tenantId = $tenantId;
        $this->importId = $importId;
        $this->importMode = $importMode;
        $this->isDryRun = $isDryRun;
        $this->defaultVatRate = \App\Domain\Shared\Services\TaxRateResolver::resolve();
        // Pre-load categories for fast lookup to minimize DB queries
        $cats = CategoryModel::where('tenant_id', $tenantId)->get(['id', 'name']);
        foreach ($cats as $c) {
            $this->categories[strtolower(trim($c->name))] = $c->id;
        }

        // Pre-load units for fast lookup
        if (class_exists(\App\Infrastructure\Eloquent\Models\ProductUnitModel::class)) {
            $productUnits = \App\Infrastructure\Eloquent\Models\ProductUnitModel::where('tenant_id', $tenantId)->get(['id', 'unit_name']);
            foreach ($productUnits as $u) {
                $this->units[strtolower(trim($u->unit_name))] = $u->id;
            }
        }
        
        $customerList = CustomerModel::where('tenant_id', $tenantId)->get(['id', 'name']);
        foreach ($customerList as $c) {
            $this->customers[strtolower(trim($c->name))] = $c->id;
        }

        // Pre-load brands
        $brandRecords = \App\Infrastructure\Eloquent\Models\BrandModel::where('tenant_id', $tenantId)->get(['id', 'name']);
        foreach ($brandRecords as $b) {
            $this->brands[strtolower(trim($b->name))] = $b->id;
        }

        // Resume Logic
        if ($this->importId) {
            $record = \App\Infrastructure\Eloquent\Models\DataImportModel::find($this->importId);
            if ($record) {
                $this->rollbackId = $record->rollback_id;
                if ($record->processed_rows > 0) {
                    // Resume from where we left off (Data rows start at 2, so offset by processed)
                    $this->startRow = $record->processed_rows + 2;
                }
            }
        }
    }

    public function startRow(): int
    {
        return $this->startRow;
    }

    public function model(array $row)
    {
        $categoryId = null;
        if (!empty($row['category_name'])) {
            $catName = strtolower(trim($row['category_name']));
            $categoryId = $this->categories[$catName] ?? null;
            // If strictly mapping category and it doesn't exist, we could throw exception here
            // but we allow null if not matched, or rely on validation rule later.
        }

        $providedId = trim((string) ($row['id'] ?? $row['uuid'] ?? $row['product_uuid'] ?? ''));
        $providedSku = trim((string) ($row['sku'] ?? ''));
        $providedBarcode = trim((string) ($row['barcode'] ?? ''));
        $providedPartNumber = trim((string) ($row['part_number'] ?? ''));
        $providedOem = trim((string) ($row['oem_number'] ?? ''));
        $providedAlias = trim((string) ($row['alias'] ?? ''));
        $providedCustomerAlias = trim((string) ($row['customer_aliases'] ?? ''));

        if ($this->importMode === 'ignore_duplicates') {
            $identifierKey = $providedId ?: $providedBarcode ?: $providedSku;
            if ($identifierKey) {
                if (isset($this->processedInFile[$identifierKey])) {
                    $this->skippedCount++;

                    return null;
                }
                $this->processedInFile[$identifierKey] = true;
            }
        }

        $product = null;

        // Priority 1: Product UUID
        if ($providedId && !$product) {
            $product = ProductModel::query()->where('tenant_id', $this->tenantId)->where('id', $providedId)->first();
        }
        // Priority 2: Barcode
        if ($providedBarcode && !$product) {
            $product = ProductModel::query()->where('tenant_id', $this->tenantId)->where('barcode', $providedBarcode)->first();
        }
        // Priority 3: SKU
        if ($providedSku && !$product) {
            $product = ProductModel::query()->where('tenant_id', $this->tenantId)->where('sku', $providedSku)->first();
        }
        // Priority 4: Product Code (Part Number)
        if ($providedPartNumber && !$product) {
            $product = ProductModel::query()->where('tenant_id', $this->tenantId)->where('part_number', $providedPartNumber)->first();
        }
        // Priority 5: OEM Number
        if ($providedOem && !$product) {
            $product = ProductModel::query()->where('tenant_id', $this->tenantId)->where('oem_number', $providedOem)->first();
        }
        // Priority 6: Alias
        if ($providedAlias && !$product) {
            $aliasList = array_map('trim', explode('|', $providedAlias));
            $aliasRecord = \App\Infrastructure\Eloquent\Models\ProductAliasModel::where('tenant_id', $this->tenantId)
                ->whereIn('alias_name', $aliasList)->first();
            if ($aliasRecord) {
                $product = ProductModel::query()->find($aliasRecord->product_id);
            }
        }

        $sku = $providedSku ?: $providedBarcode ?: $providedPartNumber ?: $providedOem ?: ('AUTO-' . mt_rand(100000, 999999));

        $rowHash = hash('sha256', json_encode($row));

        if ($product && $product->import_hash === $rowHash) {
            if ($this->importMode === 'create_only') {
                $this->skippedCount++;
            } else {
                $this->unchangedCount++;
            }
            return null; // Skip further mapping and saves entirely!
        }

        $isTargetedUpdate = in_array($this->importMode, ['update_prices', 'update_status', 'update_category', 'update_brand', 'update_aliases', 'update_description']);

        if (!$product && ($this->importMode === 'update_only' || $isTargetedUpdate)) {
            $this->skippedCount++;
            return null;
        }

        $brandId = null;
        $brandName = $row['brand'] ?? null;
        if ($brandName) {
            $brandKey = strtolower(trim((string)$brandName));
            if (isset($this->brands[$brandKey])) {
                $brandId = $this->brands[$brandKey];
            } elseif ($this->isDryRun) {
                // Preview only: don't actually create the brand, just use a
                // throwaway id so the row can still be previewed/counted.
                $brandId = Str::uuid()->toString();
            } else {
                $brandId = Str::uuid()->toString();
                \App\Infrastructure\Eloquent\Models\BrandModel::insert([
                    'id' => $brandId,
                    'tenant_id' => $this->tenantId,
                    'name' => trim((string)$brandName),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $this->brands[$brandKey] = $brandId;
            }
        }

        $attributes = [
            'barcode' => $row['barcode'] ?? null,
            'name' => $row['product_name'],
            'name_ar' => $row['arabic_name'] ?? $row['product_name'],
            'category_id' => $categoryId,
            'unit_of_measure' => $row['unit_name'] ?? null,
            'cost_price' => isset($row['cost_price']) ? (float) $row['cost_price'] : 0,
            'sell_price' => (float) $row['sell_price'],
            'wholesale_price' => isset($row['wholesale_price']) ? (float) $row['wholesale_price'] : 0,
            'vat_rate' => isset($row['vat_rate']) ? (float) $row['vat_rate'] : $this->defaultVatRate,
            'stock_alert_level' => isset($row['min_stock']) ? (int) $row['min_stock'] : (isset($row['alert_level']) ? (int) $row['alert_level'] : 10),
            'oem_number' => $row['oem_number'] ?? null,
            'part_number' => $row['part_number'] ?? null,
            'brand' => $brandName,
            'brand_id' => $brandId,
            'is_active' => isset($row['is_active']) ? (bool) $row['is_active'] : true,
            'description' => $row['description'] ?? null,
            'import_hash' => $rowHash,
        ];

        if ($product && $isTargetedUpdate) {
            $restricted = ['import_hash' => $rowHash];
            if ($this->importMode === 'update_prices') {
                $restricted['cost_price'] = $attributes['cost_price'];
                $restricted['sell_price'] = $attributes['sell_price'];
                $restricted['wholesale_price'] = $attributes['wholesale_price'];
            } elseif ($this->importMode === 'update_status') {
                $restricted['is_active'] = $attributes['is_active'];
            } elseif ($this->importMode === 'update_category') {
                $restricted['category_id'] = $attributes['category_id'];
            } elseif ($this->importMode === 'update_brand') {
                $restricted['brand'] = $attributes['brand'];
                $restricted['brand_id'] = $attributes['brand_id'];
            } elseif ($this->importMode === 'update_description') {
                $restricted['description'] = $attributes['description'];
            }
            $attributes = $restricted;
        }

        $productId = $product ? $product->id : Str::uuid()->toString();

        if (!empty($providedAlias)) {
            if (!$isTargetedUpdate || $this->importMode === 'update_aliases') {
                $aliasList = array_map('trim', explode('|', $providedAlias));
                foreach ($aliasList as $aName) {
                    if ($aName) {
                        $this->pendingAliases[] = [
                            'id' => Str::uuid()->toString(),
                            'tenant_id' => $this->tenantId,
                            'product_id' => $productId,
                            'alias_name' => $aName,
                            'created_at' => now(),
                            'updated_at' => now()
                        ];
                    }
                }
            }
        }

        if (!empty($providedCustomerAlias)) {
            if (!$isTargetedUpdate || $this->importMode === 'update_aliases') {
                $customerAliasPairs = array_map('trim', explode('|', $providedCustomerAlias));
                foreach ($customerAliasPairs as $pair) {
                    if (str_contains($pair, '=')) {
                        $parts = explode('=', $pair, 2);
                        $cName = strtolower(trim($parts[0]));
                        $aName = trim($parts[1]);
                        
                        if (isset($this->customers[$cName]) && $aName) {
                            $this->pendingCustomerAliases[] = [
                                'id' => Str::uuid()->toString(),
                                'tenant_id' => $this->tenantId,
                                'product_id' => $productId,
                                'customer_id' => $this->customers[$cName],
                                'alias_name' => $aName,
                                'created_at' => now(),
                                'updated_at' => now()
                            ];
                        }
                    }
                }
            }
        }

        if ($product) {
            if ($this->importMode === 'create_only') {
                $this->skippedCount++;
                return null;
            }
            
            $product->fill($attributes);
            
            if ($product->isDirty()) {
                if (!$this->isDryRun) {
                    $product->save();
                }
                $this->updatedCount++;
            } else {
                $this->unchangedCount++;
            }
            
            return null; // Skip batch insert to avoid duplicate keys
        } else {
            if ($this->importMode === 'update_only') {
                $this->skippedCount++;
                return null;
            }

            $attributes['id'] = $productId;
            $attributes['tenant_id'] = $this->tenantId;
            $attributes['sku'] = $sku;
            $attributes['rollback_id'] = $this->rollbackId;
            $attributes['created_at'] = now();
            $attributes['updated_at'] = now();

            if (!$this->isDryRun) {
                // Enterprise Performance: Delay insert to batch processing in AfterChunk
                $this->pendingProducts[] = $attributes;
            }
            $this->importedCount++;
            return null;
        }
    }

    public function rules(): array
    {
        return [
            'sku' => 'required|string|max:255',
            'barcode' => 'nullable|string|max:255',
            'product_name' => 'required|string|max:255',
            'arabic_name' => 'nullable|string|max:255',
            'sell_price' => 'required|numeric|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'vat_rate' => 'nullable|numeric|between:0,100',
            'stock' => 'nullable|numeric|min:0',
            'category_name' => [
                'nullable',
                'string',
                function ($attribute, $value, $fail) {
                    if (!isset($this->categories[strtolower(trim($value))])) {
                        $fail("Category '{$value}' does not exist.");
                    }
                },
            ],
            'unit_name' => [
                'nullable',
                'string',
                function ($attribute, $value, $fail) {
                    if (!isset($this->units[strtolower(trim($value))])) {
                        $fail("Unit '{$value}' does not exist.");
                    }
                },
            ],
            // No existence check here: model() auto-creates a new brand when
            // the name isn't already known, by design. A previous version of
            // this rule rejected unknown brand names outright, which made
            // that auto-create logic in model() permanently unreachable.
            'brand' => 'nullable|string',
        ];
    }

    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            $data = $validator->getData();
            foreach ($data as $key => $row) {
                // Ensure $row is an array before processing
                if (!is_array($row)) continue;

                $providedId = trim((string) ($row['id'] ?? $row['uuid'] ?? $row['product_uuid'] ?? ''));
                $providedSku = trim((string) ($row['sku'] ?? ''));
                $providedBarcode = trim((string) ($row['barcode'] ?? ''));
                
                // Duplicate rows validation within file.
                // In 'ignore_duplicates' mode, duplicates are silently skipped
                // in model() instead (see $processedInFile) rather than failed
                // here, so don't flag them as a validation error in that mode.
                $identifierKey = $providedId ?: $providedBarcode ?: $providedSku;
                if ($identifierKey) {
                    if (isset($this->seenIdentifiers[$identifierKey])) {
                        if ($this->importMode !== 'ignore_duplicates') {
                            $validator->errors()->add("{$key}.sku", "Duplicate row within the file.");
                        }
                        continue;
                    }
                    $this->seenIdentifiers[$identifierKey] = true;
                }

                // Invalid UTF Validation
                if (isset($row['product_name']) && !mb_check_encoding($row['product_name'], 'UTF-8')) {
                    $validator->errors()->add("{$key}.product_name", "Invalid UTF encoding.");
                }

                // Cross-reference matching to validate Unique Constraints without failing on updates
                $providedPartNumber = trim((string) ($row['part_number'] ?? ''));
                $providedOem = trim((string) ($row['oem_number'] ?? ''));
                $providedAlias = trim((string) ($row['alias'] ?? ''));

                $matchedProduct = null;
                
                // Priority 1: Product UUID
                if ($providedId && !$matchedProduct) $matchedProduct = ProductModel::query()->where('tenant_id', $this->tenantId)->where('id', $providedId)->first();
                // Priority 2: Barcode
                if ($providedBarcode && !$matchedProduct) $matchedProduct = ProductModel::query()->where('tenant_id', $this->tenantId)->where('barcode', $providedBarcode)->first();
                // Priority 3: SKU
                if ($providedSku && !$matchedProduct) $matchedProduct = ProductModel::query()->where('tenant_id', $this->tenantId)->where('sku', $providedSku)->first();
                // Priority 4: Product Code (Part Number)
                if ($providedPartNumber && !$matchedProduct) $matchedProduct = ProductModel::query()->where('tenant_id', $this->tenantId)->where('part_number', $providedPartNumber)->first();
                // Priority 5: OEM Number
                if ($providedOem && !$matchedProduct) $matchedProduct = ProductModel::query()->where('tenant_id', $this->tenantId)->where('oem_number', $providedOem)->first();
                // Priority 6: Alias
                if ($providedAlias && !$matchedProduct) {
                    $aliasRecord = \App\Infrastructure\Eloquent\Models\ProductAliasModel::where('tenant_id', $this->tenantId)
                        ->where('alias_name', $providedAlias)->first();
                    if ($aliasRecord) $matchedProduct = ProductModel::query()->find($aliasRecord->product_id);
                }

                $matchedId = $matchedProduct ? $matchedProduct->id : null;

                // Unique Barcode
                if ($providedBarcode) {
                    $exists = ProductModel::where('tenant_id', $this->tenantId)
                        ->where('barcode', $providedBarcode)
                        ->when($matchedId, fn($q) => $q->where('id', '!=', $matchedId))
                        ->exists();
                    if ($exists) {
                        $validator->errors()->add("{$key}.barcode", "Barcode is already in use by another product.");
                    }
                }

                // Unique SKU
                if ($providedSku) {
                    $exists = ProductModel::where('tenant_id', $this->tenantId)
                        ->where('sku', $providedSku)
                        ->when($matchedId, fn($q) => $q->where('id', '!=', $matchedId))
                        ->exists();
                    if ($exists) {
                        $validator->errors()->add("{$key}.sku", "SKU is already in use by another product.");
                    }
                }
            }
        });
    }

    public function batchSize(): int
    {
        return 500;
    }

    public function chunkSize(): int
    {
        return 500;
    }

    public function registerEvents(): array
    {
        return [
            BeforeImport::class => function (BeforeImport $event) {
                if (!$this->importId) return;
                $totalRows = $event->reader->getTotalRows();
                $sheetCount = reset($totalRows) ?? 0;
                
                // Enterprise Audit: Generate rollback ID when import starts processing
                $rollbackId = \Illuminate\Support\Str::uuid()->toString();

                \App\Infrastructure\Eloquent\Models\DataImportModel::where('id', $this->importId)
                    ->update([
                        'status' => 'processing',
                        'total_rows' => max(0, $sheetCount - 1),
                        'rollback_id' => $rollbackId,
                    ]);
            },
            AfterChunk::class => function(AfterChunk $event) {
                if ($this->importId) {
                    $importRecord = \App\Infrastructure\Eloquent\Models\DataImportModel::find($this->importId);
                    if ($importRecord && $importRecord->status === 'cancelled') {
                        throw new \Exception('Import Cancelled by User');
                    }
                }

                if (!empty($this->pendingProducts)) {
                    if (!$this->isDryRun) {
                        $chunks = array_chunk($this->pendingProducts, 500);
                        foreach ($chunks as $c) {
                            \App\Infrastructure\Eloquent\Models\ProductModel::insert($c);
                        }
                    }
                    $this->pendingProducts = [];
                }

                if (!empty($this->pendingAliases)) {
                    if (!$this->isDryRun && !empty($this->pendingAliases)) {
                        $chunks = array_chunk($this->pendingAliases, 500);
                        foreach ($chunks as $c) {
                            \App\Infrastructure\Eloquent\Models\ProductAliasModel::insert($c);
                        }
                    }
                    $this->pendingAliases = [];
                }
                
                if (!empty($this->pendingCustomerAliases)) {
                    if (!$this->isDryRun) {
                        $chunks = array_chunk($this->pendingCustomerAliases, 500);
                        foreach ($chunks as $c) {
                            \App\Infrastructure\Eloquent\Models\ProductCustomerAliasModel::insert($c);
                        }
                    }
                    $this->pendingCustomerAliases = [];
                }
                
                if ($this->importId) {
                    \App\Infrastructure\Eloquent\Models\DataImportModel::where('id', $this->importId)
                        ->increment('processed_rows', 500);
                        
                    // Audit Log increments
                    \App\Infrastructure\Eloquent\Models\DataImportModel::where('id', $this->importId)
                        ->increment('imported_rows', $this->importedCount);
                    \App\Infrastructure\Eloquent\Models\DataImportModel::where('id', $this->importId)
                        ->increment('updated_rows', $this->updatedCount);
                    \App\Infrastructure\Eloquent\Models\DataImportModel::where('id', $this->importId)
                        ->increment('skipped_rows', $this->skippedCount + $this->unchangedCount);
                }
                
                // Reset chunk counters
                $this->importedCount = 0;
                $this->updatedCount = 0;
                $this->skippedCount = 0;
                $this->unchangedCount = 0;
                
                // Memory optimization hint
                gc_collect_cycles();
            },
            AfterImport::class => function (AfterImport $event) {
                if (!$this->importId) return;
                $finalStatus = $this->isDryRun ? 'dry_run_completed' : 'completed';
                
                $importRecord = \App\Infrastructure\Eloquent\Models\DataImportModel::find($this->importId);
                $duration = $importRecord ? now()->diffInSeconds($importRecord->updated_at) : 0;

                \App\Infrastructure\Eloquent\Models\DataImportModel::where('id', $this->importId)
                    ->update([
                        'status' => $finalStatus,
                        'duration' => $duration
                    ]);
            },
            ImportFailed::class => function (ImportFailed $event) {
                if (!$this->importId) return;
                \App\Infrastructure\Eloquent\Models\DataImportModel::where('id', $this->importId)
                    ->update([
                        'status' => 'failed',
                        'error_message' => $event->getException()->getMessage()
                    ]);
            },
        ];
    }

    public function onFailure(\Maatwebsite\Excel\Validators\Failure ...$failures)
    {
        if (!$this->importId || empty($failures)) {
            return;
        }

        // Each chunk runs as its own queued job, so concurrent workers can
        // call this for the same import at once. A plain find()-then-save()
        // is a read-modify-write race: two workers can both read the same
        // failed_rows array and the slower save() silently discards the
        // other worker's failures. Row-lock the import record inside a
        // transaction so the read and write are atomic across workers.
        DB::connection('tenant')->transaction(function () use ($failures) {
            $importRecord = \App\Infrastructure\Eloquent\Models\DataImportModel::where('id', $this->importId)
                ->lockForUpdate()
                ->first();

            if (!$importRecord) {
                return;
            }

            $existing = $importRecord->failed_rows ?? [];
            foreach ($failures as $failure) {
                $existing[] = [
                    'row' => $failure->row(),
                    'attribute' => $failure->attribute(),
                    'errors' => $failure->errors(),
                    'values' => $failure->values(),
                ];
            }
            $importRecord->failed_rows = $existing;
            $importRecord->failed_row_count = count($existing);
            $importRecord->save();
        });
    }
}
