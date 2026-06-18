<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Inventory;

use App\Application\Services\InventoryService;
use App\Domain\Accounting\Entities\JournalEntry;
use App\Domain\Accounting\Entities\JournalEntryLine;
use App\Domain\Accounting\Repositories\JournalEntryRepositoryInterface;
use App\Domain\Accounting\Services\AccountMappingService;
use App\Domain\Inventory\Services\InventoryValuationService;
use App\Infrastructure\Eloquent\Models\StocktakeModel;
use App\Infrastructure\Eloquent\Models\WarehouseProductModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class StocktakeController extends BaseTenantController
{
    public function __construct(
        private InventoryService $inventoryService,
        private JournalEntryRepositoryInterface $journalEntryRepository,
        private AccountMappingService $accountMapping,
        private InventoryValuationService $valuationService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = StocktakeModel::query()->where(['tenant_id' => $this->getTenantId($request)])
            ->with(['warehouse', 'assignedUser']);

        if ($request->filled('status')) {
            $query->where(['status' => $request->status]);
        }

        $colCreatedAt = 'created_at';
        $records = $query->orderBy($colCreatedAt, 'desc')->paginate($request->get('per_page', 15));

        return $this->success($records->toArray(), 'Stocktakes retrieved.');
    }

    public function store(Request $request): JsonResponse
    {
        $colTenant = 'tenant_id';
        $validated = $request->validate([
            'warehouse_id' => [
                'required',
                'uuid',
                Rule::exists('tenant.warehouses', 'id')->where($colTenant, $this->getTenantId($request)),
            ],
            'category_id' => 'nullable|uuid',
            'scheduled_date' => 'required|date',
            'assigned_to' => 'nullable|uuid',
            'notes' => 'nullable|string',
            'type' => 'nullable|in:full,partial,cycle',
            'is_blind' => 'nullable|boolean',
            'is_frozen' => 'nullable|boolean',
            'product_ids' => 'nullable|array',
            'product_ids.*' => 'uuid',
            'limit' => 'nullable|integer|min:1|max:5000',
        ]);

        try {
            DB::connection('tenant')->beginTransaction();

            $ref = 'STK-'.date('Ymd').'-'.strtoupper(Str::random(4));

            $stocktake = StocktakeModel::query()->create([
                'id' => Str::uuid()->toString(),
                'tenant_id' => $this->getTenantId($request),
                'reference_number' => $ref,
                'warehouse_id' => $validated['warehouse_id'],
                'category_id' => $validated['category_id'] ?? null,
                'type' => $validated['type'] ?? 'full',
                'is_blind' => $validated['is_blind'] ?? false,
                'is_frozen' => $validated['is_frozen'] ?? false,
                'status' => 'draft',
                'assigned_to' => $validated['assigned_to'] ?? null,
                'scheduled_date' => $validated['scheduled_date'],
                'notes' => $validated['notes'] ?? null,
                'created_by' => $request->user()?->id,
            ]);

            // Snapshot existing warehouse products
            $productsQuery = WarehouseProductModel::query()
                ->where(['tenant_id' => $this->getTenantId($request)])
                ->where(['warehouse_id' => $validated['warehouse_id']])
                ->with('product');

            if (!empty($validated['category_id'])) {
                $productsQuery->whereHas('product', function ($q) use ($validated) {
                    $q->where(['category_id' => $validated['category_id']]);
                });
            }
            
            if (($validated['type'] ?? 'full') === 'partial' && !empty($validated['product_ids'])) {
                $productsQuery->whereIn('product_id', $validated['product_ids']);
            } elseif (($validated['type'] ?? 'full') === 'cycle') {
                $limit = $validated['limit'] ?? 50;
                $productsQuery->inRandomOrder()->limit($limit);
            }

            $warehouseProducts = $productsQuery->get();

            foreach ($warehouseProducts as $wp) {
                if (!$wp->product) continue;

                $stocktake->items()->create([
                    'id' => Str::uuid()->toString(),
                    'product_id' => $wp->product_id,
                    'bin_location' => $wp->bin_location,
                    'expected_quantity' => (float) $wp->quantity,
                    'counted_quantity' => null, // Not counted yet
                    'difference' => 0,
                    'unit_cost' => (float) ($wp->average_cost > 0 ? $wp->average_cost : $wp->product->cost_price),
                    'variance_value' => 0,
                ]);
            }

            DB::connection('tenant')->commit();

            return $this->success($stocktake->load('items.product')->toArray(), 'Stocktake session created successfully.', 201);
        } catch (\Exception $e) {
            DB::connection('tenant')->rollBack();
            return $this->error('Failed to create stocktake: '.$e->getMessage(), 500);
        }
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $stocktake = StocktakeModel::query()
            ->where(['tenant_id' => $this->getTenantId($request)])
            ->with(['warehouse', 'assignedUser', 'items.product'])
            ->find($id);

        if (!$stocktake) {
            return $this->error('Stocktake not found', 404);
        }

        $data = $stocktake->toArray();

        // Blind stocktake logic: hide expected quantities from counters during counting phase
        if ($stocktake->is_blind && !in_array($stocktake->status, ['review', 'completed', 'cancelled'])) {
            foreach ($data['items'] as &$item) {
                $item['expected_quantity'] = null;
                $item['difference'] = null;
                $item['variance_value'] = null;
            }
        }

        return $this->success($data);
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:draft,counting,review,completed,cancelled',
        ]);

        $stocktake = StocktakeModel::query()
            ->where(['tenant_id' => $this->getTenantId($request)])
            ->find($id);

        if (!$stocktake) {
            return $this->error('Stocktake not found', 404);
        }

        if ($stocktake->status === 'completed' || $stocktake->status === 'cancelled') {
            return $this->error('Cannot change status of completed or cancelled stocktakes', 400);
        }

        $stocktake->update(['status' => $validated['status']]);

        return $this->success($stocktake->toArray(), 'Status updated successfully');
    }

    public function updateCounts(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'items' => 'required|array',
            'items.*.product_id' => 'required|uuid',
            'items.*.counted_quantity' => 'required|numeric|min:0',
        ]);

        $stocktake = StocktakeModel::query()
            ->where(['tenant_id' => $this->getTenantId($request)])
            ->find($id);

        if (!$stocktake || !in_array($stocktake->status, ['draft', 'counting', 'review'])) {
            return $this->error('Stocktake not found or not in a countable status', 404);
        }

        try {
            DB::connection('tenant')->beginTransaction();

            foreach ($validated['items'] as $itemData) {
                $item = $stocktake->items()->where(['product_id' => $itemData['product_id']])->first();
                if ($item) {
                    $counted = (float) $itemData['counted_quantity'];
                    $expected = (float) $item->expected_quantity;
                    $diff = $counted - $expected;
                    $varValue = $diff * (float) $item->unit_cost;

                    $item->update([
                        'counted_quantity' => $counted,
                        'difference' => $diff,
                        'variance_value' => $varValue,
                        'counted_by' => $request->user()?->id,
                    ]);
                }
            }

            DB::connection('tenant')->commit();
            
            return $this->success(null, 'Counts updated successfully');
        } catch (\Exception $e) {
            DB::connection('tenant')->rollBack();
            return $this->error('Failed to update counts: '.$e->getMessage(), 500);
        }
    }

    public function approve(Request $request, string $id): JsonResponse
    {
        $stocktake = StocktakeModel::query()
            ->where(['tenant_id' => $this->getTenantId($request)])
            ->with('items.product')
            ->find($id);

        if (!$stocktake) {
            return $this->error('Stocktake not found', 404);
        }

        if ($stocktake->status === 'completed') {
            return $this->error('Stocktake is already completed', 400);
        }

        try {
            DB::connection('tenant')->beginTransaction();

            $totalLoss = 0;
            $totalGain = 0;

            foreach ($stocktake->items as $item) {
                if ($item->counted_quantity === null) {
                    // Treat uncounted as 0 to enforce full stocktake, or skip. Here we assume 0.
                    $counted = 0;
                    $diff = $counted - $item->expected_quantity;
                    $varValue = $diff * $item->unit_cost;
                    $item->update([
                        'counted_quantity' => 0,
                        'difference' => $diff,
                        'variance_value' => $varValue,
                    ]);
                } else {
                    $diff = $item->difference;
                }

                if ($diff != 0) {
                    // Use InventoryValuationService to apply the difference
                    // This handles Cost Layers (FIFO), Stock Ledger, and Stock Movements correctly.
                    $transactionCost = $this->valuationService->recordMovement(
                        $item->product_id,
                        $stocktake->warehouse_id,
                        $diff,
                        $item->unit_cost,
                        'adjustment',
                        $stocktake->id,
                        $request->user()?->id
                    );

                    // Financial variance tracking
                    if ($diff < 0) {
                        $totalLoss += abs($transactionCost); // Use the actual cost computed by valuation (FIFO layers)
                    } else {
                        $totalGain += abs($transactionCost);
                    }
                }
            }

            // Generate Journal Entry if there is any financial impact
            if ($totalLoss > 0 || $totalGain > 0) {
                $entry = new JournalEntry(
                    id: null,
                    entryNumber: $this->journalEntryRepository->getNextEntryNumber(),
                    date: new \DateTimeImmutable(now()->toDateString()),
                    description: "Stocktake Variances Approval (Ref: {$stocktake->reference_number})",
                    isPosted: true,
                    referenceType: 'stocktake',
                    referenceId: $stocktake->id,
                    createdBy: $request->user()?->id ?? ''
                );

                $inventoryAccount = $this->accountMapping->resolve('inventory');
                $shrinkageAccount = $this->accountMapping->resolve('inventory_shrinkage'); // Represents loss/gain

                if ($totalLoss > 0) {
                    // Loss: Debit Shrinkage, Credit Inventory
                    $entry->addLine(new JournalEntryLine(id: null, journalEntryId: '', accountId: $shrinkageAccount, debit: $totalLoss, credit: 0, description: 'Inventory Shrinkage (Loss)'));
                    $entry->addLine(new JournalEntryLine(id: null, journalEntryId: '', accountId: $inventoryAccount, debit: 0, credit: $totalLoss, description: 'Inventory Shrinkage (Loss)'));
                }

                if ($totalGain > 0) {
                    // Gain: Debit Inventory, Credit Shrinkage (or Gain account)
                    $entry->addLine(new JournalEntryLine(id: null, journalEntryId: '', accountId: $inventoryAccount, debit: $totalGain, credit: 0, description: 'Inventory Surplus (Gain)'));
                    $entry->addLine(new JournalEntryLine(id: null, journalEntryId: '', accountId: $shrinkageAccount, debit: 0, credit: $totalGain, description: 'Inventory Surplus (Gain)'));
                }

                $this->journalEntryRepository->create($entry);
            }

            $stocktake->update([
                'status' => 'completed',
                'approved_by' => $request->user()?->id,
            ]);

            DB::connection('tenant')->commit();
            
            return $this->success($stocktake->toArray(), 'Stocktake approved and variances applied successfully.');
        } catch (\Exception $e) {
            DB::connection('tenant')->rollBack();
            return $this->error('Failed to approve stocktake: '.$e->getMessage(), 500);
        }
    }

    public function requestRecount(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'item_ids' => 'required|array',
            'item_ids.*' => 'uuid',
        ]);

        $stocktake = StocktakeModel::query()
            ->where(['tenant_id' => $this->getTenantId($request)])
            ->find($id);

        if (!$stocktake) return $this->error('Stocktake not found', 404);
        if ($stocktake->status === 'completed') return $this->error('Cannot recount a completed stocktake', 400);

        // Reset counted_quantity for selected items
        $stocktake->items()->whereIn('id', $validated['item_ids'])->update([
            'counted_quantity' => null,
            'difference' => 0,
            'variance_value' => 0,
            'is_recounted' => true,
        ]);

        // Change status back to counting if it was in review
        if ($stocktake->status === 'review') {
            $stocktake->update(['status' => 'counting']);
        }

        return $this->success(null, 'Recount requested for selected items.');
    }

    public function exportStocktakeSheet(Request $request, string $id)
    {
        $stocktake = StocktakeModel::query()
            ->where(['tenant_id' => $this->getTenantId($request)])
            ->with('items.product')
            ->find($id);

        if (!$stocktake) return $this->error('Stocktake not found', 404);

        $fileName = "stocktake_{$stocktake->reference_number}.csv";
        
        $headers = [
            "Content-type"        => "text/csv",
            "Content-Disposition" => "attachment; filename=$fileName",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0"
        ];

        $columns = ['Item ID', 'Product ID', 'SKU', 'Product Name', 'Bin Location', 'Counted Quantity'];

        $callback = function() use($stocktake, $columns) {
            $file = fopen('php://output', 'w');
            fputcsv($file, $columns);

            foreach ($stocktake->items as $item) {
                fputcsv($file, [
                    $item->id,
                    $item->product_id,
                    $item->product?->sku ?? '',
                    $item->product?->name ?? '',
                    $item->bin_location ?? '',
                    $item->counted_quantity ?? '' // Empty for filling in
                ]);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function importStocktakeSheet(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:10240',
        ]);

        $stocktake = StocktakeModel::query()
            ->where(['tenant_id' => $this->getTenantId($request)])
            ->find($id);

        if (!$stocktake || !in_array($stocktake->status, ['draft', 'counting', 'review'])) {
            return $this->error('Stocktake not found or not in a countable status', 404);
        }

        $file = $request->file('file');
        $stream = fopen($file->getRealPath(), 'r');
        $header = fgetcsv($stream);

        if (!$header || count($header) < 6) {
            return $this->error('Invalid CSV format. Please use the exported template.', 400);
        }

        $updates = [];
        while (($row = fgetcsv($stream)) !== false) {
            if (count($row) < 6) continue;
            
            $itemId = trim($row[0]);
            $countedQty = trim($row[5]);

            if (!empty($itemId) && is_numeric($countedQty)) {
                $updates[$itemId] = (float) $countedQty;
            }
        }
        fclose($stream);

        if (empty($updates)) {
            return $this->error('No valid data found to import.', 400);
        }

        try {
            DB::connection('tenant')->beginTransaction();

            $items = $stocktake->items()->whereIn('id', array_keys($updates))->get();

            foreach ($items as $item) {
                $counted = $updates[$item->id];
                $expected = (float) $item->expected_quantity;
                $diff = $counted - $expected;
                $varValue = $diff * (float) $item->unit_cost;

                $item->update([
                    'counted_quantity' => $counted,
                    'difference' => $diff,
                    'variance_value' => $varValue,
                    'counted_by' => $request->user()?->id,
                ]);
            }

            DB::connection('tenant')->commit();
            return $this->success(null, count($items) . ' items counted successfully via import.');
        } catch (\Exception $e) {
            DB::connection('tenant')->rollBack();
            return $this->error('Failed to import stocktake counts: '.$e->getMessage(), 500);
        }
    }

    public function addUnlistedItem(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => 'required|uuid',
            'counted_quantity' => 'required|numeric|min:0',
            'bin_location' => 'nullable|string',
        ]);

        $stocktake = StocktakeModel::query()
            ->where(['tenant_id' => $this->getTenantId($request)])
            ->find($id);

        if (!$stocktake || !in_array($stocktake->status, ['draft', 'counting', 'review'])) {
            return $this->error('Stocktake not found or not in a countable status', 404);
        }

        // Check if item already exists
        $existing = $stocktake->items()->where('product_id', $validated['product_id'])->first();
        if ($existing) {
            return $this->error('Product is already in the stocktake list. Please update its count instead.', 400);
        }

        // Get product to find its cost
        $product = \App\Infrastructure\Eloquent\Models\ProductModel::query()
            ->where('tenant_id', $this->getTenantId($request))
            ->find($validated['product_id']);

        if (!$product) {
            return $this->error('Product not found', 404);
        }

        $counted = (float) $validated['counted_quantity'];
        $unitCost = (float) $product->cost_price; // Default cost since it was unlisted
        $varValue = $counted * $unitCost;

        $item = $stocktake->items()->create([
            'id' => Str::uuid()->toString(),
            'product_id' => $product->id,
            'bin_location' => $validated['bin_location'] ?? null,
            'expected_quantity' => 0, // Unlisted means expected 0
            'counted_quantity' => $counted,
            'difference' => $counted,
            'unit_cost' => $unitCost,
            'variance_value' => $varValue,
            'counted_by' => $request->user()?->id,
        ]);

        return $this->success($item->load('product')->toArray(), 'Unlisted item added successfully.');
    }

    public function scanBarcode(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'barcode' => 'required|string',
        ]);

        $stocktake = StocktakeModel::query()
            ->where(['tenant_id' => $this->getTenantId($request)])
            ->find($id);

        if (!$stocktake || !in_array($stocktake->status, ['draft', 'counting', 'review'])) {
            return $this->error('Stocktake not found or not in a countable status', 404);
        }

        $product = \App\Infrastructure\Eloquent\Models\ProductModel::query()
            ->where('tenant_id', $this->getTenantId($request))
            ->where(function($q) use ($validated) {
                $q->where('barcode', $validated['barcode'])
                  ->orWhere('sku', $validated['barcode']);
            })
            ->first();

        if (!$product) {
            return $this->error('Product not found with this barcode', 404);
        }

        $item = $stocktake->items()->where('product_id', $product->id)->first();

        if ($item) {
            $counted = ($item->counted_quantity ?? 0) + 1;
            $diff = $counted - (float) $item->expected_quantity;
            $item->update([
                'counted_quantity' => $counted,
                'difference' => $diff,
                'variance_value' => $diff * (float) $item->unit_cost,
                'counted_by' => $request->user()?->id,
            ]);
        } else {
            // Unlisted item found via scan
            $unitCost = (float) $product->cost_price;
            $item = $stocktake->items()->create([
                'id' => Str::uuid()->toString(),
                'product_id' => $product->id,
                'expected_quantity' => 0,
                'counted_quantity' => 1,
                'difference' => 1,
                'unit_cost' => $unitCost,
                'variance_value' => $unitCost,
                'counted_by' => $request->user()?->id,
            ]);
        }

        return $this->success([
            'product_name' => $product->name,
            'counted_quantity' => $item->counted_quantity,
        ], 'Barcode scanned and count incremented.');
    }
}
