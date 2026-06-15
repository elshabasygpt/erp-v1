<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Inventory;

use App\Presentation\Controllers\API\BaseTenantController;
use App\Infrastructure\Eloquent\Models\InventoryAdjustmentModel;
use App\Infrastructure\Eloquent\Models\WarehouseProductModel;
use App\Infrastructure\Eloquent\Models\StockMovementModel;
use App\Infrastructure\Eloquent\Models\ProductModel;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use App\Application\Services\InventoryService;

use App\Domain\Accounting\Repositories\JournalEntryRepositoryInterface;
use App\Domain\Accounting\Entities\JournalEntry;
use App\Domain\Accounting\Entities\JournalEntryLine;
use App\Domain\Accounting\Services\AccountMappingService;

class AdjustmentController extends BaseTenantController
{
    public function __construct(
        private InventoryService $inventoryService,
        private JournalEntryRepositoryInterface $journalEntryRepository,
        private AccountMappingService $accountMapping
    ) {
    }
    public function index(Request $request): JsonResponse
    {
        $query = InventoryAdjustmentModel::where('tenant_id', $this->getTenantId($request))->with([
            'warehouse',
            'items.product'
        ]);

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('warehouse_id')) {
            $query->where('warehouse_id', $request->warehouse_id);
        }

        $records = $query->orderBy('created_at', 'desc')->paginate($request->get('per_page', 15));
        
        return $this->success($records->toArray(), 'Adjustments retrieved.');
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'warehouse_id' => [
                'required',
                'uuid',
                Rule::exists('tenant.warehouses', 'id')->where('tenant_id', $this->getTenantId($request))
            ],
            'type' => 'required|in:spoilage,reconciliation',
            'date' => 'required|date',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => [
                'required',
                'uuid',
                Rule::exists('tenant.products', 'id')->where('tenant_id', $this->getTenantId($request))
            ],
            'items.*.actual_quantity' => 'required|numeric|min:0',
        ]);

        try {
            if (app()->environment() !== 'testing') DB::connection('tenant')->beginTransaction();

            // Generate unique reference
            $ref = 'ADJ-' . date('Ymd') . '-' . strtoupper(Str::random(4));

            $adjustment = InventoryAdjustmentModel::create([
            'tenant_id' => $this->getTenantId($request),
                'reference_number' => $ref,
                'warehouse_id' => $validated['warehouse_id'],
                'date' => $validated['date'],
                'type' => $validated['type'],
                'notes' => $validated['notes'],
                'status' => 'completed',
                'created_by' => $request->user()?->id,
            ]);

            foreach ($validated['items'] as $item) {
                // Find current stock
                $currentStock = WarehouseProductModel::firstOrCreate(
                    [
                        'tenant_id'    => $this->getTenantId($request),
                        'warehouse_id' => $validated['warehouse_id'],
                        'product_id'   => $item['product_id']
                    ],
                    [
                        'quantity'     => 0,
                        'average_cost' => 0
                    ]
                );

                $expected = (float) $currentStock->quantity;
                $actual   = (float) $item['actual_quantity'];
                $diff     = $actual - $expected;

                $product = ProductModel::where('tenant_id', $this->getTenantId($request))->findOrFail($item['product_id']);
                $unitCost = $product->cost_price;

                $adjustment->items()->create([
                    'product_id' => $item['product_id'],
                    'expected_quantity' => $expected,
                    'actual_quantity' => $actual,
                    'difference' => $diff,
                    'unit_cost' => $unitCost
                ]);

                // Create Stock Movement if diff is not 0
                // For Spoilage, actual is typically 0 (meaning we lost stock) or some number less than expected.
                // Sometimes spoilage drops expected to actual by logging diff as negative.
                if ($diff != 0) {
                    $movType = $diff > 0 ? 'in' : 'out'; 
                    // Usually we log 'adjustment' as movement type from the migration: 'in', 'out', 'transfer', 'adjustment'
                    // We can use 'adjustment' and just log the numeric change (+ / -) wait, the migration allows quantity
                    
                    $this->inventoryService->logMovement(
                        $this->getTenantId($request),
                        $item['product_id'],
                        $validated['warehouse_id'],
                        'adjustment',
                        $diff,
                        $unitCost,
                        $validated['type'],
                        $adjustment->id,
                        "Inventory $validated[type]: expected $expected, actual $actual",
                        $request->user()?->id
                    );

                    // Update stock
                    $currentStock->quantity = $actual;
                    $currentStock->save();

                    // Generate Journal Entry
                    $totalCostDiff = abs($diff) * $unitCost;
                    if ($totalCostDiff > 0) {
                        $entry = new JournalEntry(
                            id: null,
                            entryNumber: $this->journalEntryRepository->getNextEntryNumber(),
                            date: new \DateTimeImmutable($validated['date']),
                            description: "Inventory Adjustment: {$validated['type']} (Ref: $ref)",
                            isPosted: true,
                            referenceType: 'inventory_adjustment',
                            referenceId: $adjustment->id,
                            createdBy: $request->user()?->id ?? ''
                        );

                        $inventoryAccount = $this->accountMapping->resolve('inventory');
                        $shrinkageAccount = $this->accountMapping->resolve('inventory_shrinkage');

                        if ($diff < 0) {
                            // Loss (Spoilage/Shrinkage): Debit Shrinkage, Credit Inventory
                            $entry->addLine(new JournalEntryLine(null, '', $shrinkageAccount, $totalCostDiff, 0, 'Inventory Loss/Shrinkage'));
                            $entry->addLine(new JournalEntryLine(null, '', $inventoryAccount, 0, $totalCostDiff, 'Inventory Loss/Shrinkage'));
                        } else {
                            // Gain: Debit Inventory, Credit Shrinkage (or Gain account)
                            $entry->addLine(new JournalEntryLine(null, '', $inventoryAccount, $totalCostDiff, 0, 'Inventory Gain'));
                            $entry->addLine(new JournalEntryLine(null, '', $shrinkageAccount, 0, $totalCostDiff, 'Inventory Gain'));
                        }

                        $this->journalEntryRepository->create($entry);
                    }
                }
            }

            if (app()->environment() !== 'testing') DB::connection('tenant')->commit();
            return $this->success($adjustment->load('items')->toArray(), 'Adjustment recorded successfully.', 201);
            
        } catch (\Exception $e) {
            if (app()->environment() !== 'testing') DB::connection('tenant')->rollBack();
            return $this->error('Failed to create adjustment: ' . $e->getMessage(), 500);
        }
    }

    public function show(Request $request, $id): JsonResponse
    {
        $adj = InventoryAdjustmentModel::where('tenant_id', $this->getTenantId($request))->with(['warehouse', 'items.product'])->find($id);
        if (!$adj) return $this->error('Not Found', 404);
        return $this->success($adj->toArray());
    }
}


