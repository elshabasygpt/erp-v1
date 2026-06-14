<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Inventory;

use App\Presentation\Controllers\API\BaseController;
use App\Infrastructure\Eloquent\Models\InventoryAdjustmentModel;
use App\Infrastructure\Eloquent\Models\WarehouseProductModel;
use App\Infrastructure\Eloquent\Models\StockMovementModel;
use App\Infrastructure\Eloquent\Models\ProductModel;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AdjustmentController extends BaseController
{
    public function index(Request $request): JsonResponse
    {
        $query = InventoryAdjustmentModel::with([
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
            'warehouse_id' => 'required|uuid|exists:tenant.warehouses,id',
            'type' => 'required|in:spoilage,reconciliation',
            'date' => 'required|date',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|uuid|exists:tenant.products,id',
            'items.*.actual_quantity' => 'required|numeric|min:0',
        ]);

        try {
            DB::connection('tenant')->beginTransaction();

            // Generate unique reference
            $ref = 'ADJ-' . date('Ymd') . '-' . strtoupper(Str::random(4));

            $adjustment = InventoryAdjustmentModel::create([
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

                $product = ProductModel::find($item['product_id']);
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
                    
                    StockMovementModel::create([
                        'product_id' => $item['product_id'],
                        'warehouse_id' => $validated['warehouse_id'],
                        'type' => 'adjustment',
                        'quantity' => $diff, // Will be negative if stock decreased
                        'cost_per_unit' => $unitCost,
                        'reference_type' => $validated['type'],
                        'reference_id' => $adjustment->id,
                        'notes' => "Inventory $validated[type]: expected $expected, actual $actual",
                        'created_by' => $request->user()?->id,
                    ]);

                    // Update stock
                    $currentStock->quantity = $actual;
                    $currentStock->save();
                }
            }

            DB::connection('tenant')->commit();
            return $this->success($adjustment->load('items')->toArray(), 'Adjustment recorded successfully.', 201);
            
        } catch (\Exception $e) {
            DB::connection('tenant')->rollBack();
            return $this->error('Failed to create adjustment: ' . $e->getMessage(), 500);
        }
    }

    public function show($id): JsonResponse
    {
        $adj = InventoryAdjustmentModel::with(['warehouse', 'items.product'])->find($id);
        if (!$adj) return $this->error('Not Found', 404);
        return $this->success($adj->toArray());
    }
}
