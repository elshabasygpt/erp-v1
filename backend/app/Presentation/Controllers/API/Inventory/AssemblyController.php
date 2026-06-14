<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Inventory;

use App\Presentation\Controllers\API\BaseController;
use App\Infrastructure\Eloquent\Models\ProductComponentModel;
use App\Infrastructure\Eloquent\Models\WarehouseProductModel;
use App\Infrastructure\Eloquent\Models\StockMovementModel;
use App\Infrastructure\Eloquent\Models\ProductModel;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AssemblyController extends BaseController
{
    // BOM Management
    public function getComponents($productId): JsonResponse
    {
        $components = ProductComponentModel::with('component')
            ->where('parent_product_id', $productId)
            ->get();
        return $this->success($components->toArray());
    }

    public function setComponents(Request $request, $productId): JsonResponse
    {
        $validated = $request->validate([
            'components' => 'present|array',
            'components.*.child_product_id' => 'required|uuid|exists:tenant.products,id',
            'components.*.quantity_required' => 'required|numeric|min:0.001',
        ]);

        ProductModel::findOrFail($productId);

        DB::connection('tenant')->beginTransaction();
        try {
            // Delete old components
            ProductComponentModel::where('parent_product_id', $productId)->delete();
            
            $inserted = [];
            foreach ($validated['components'] as $comp) {
                // Prevent self-loop
                if ($comp['child_product_id'] === $productId) continue;

                $inserted[] = ProductComponentModel::create([
                    'parent_product_id' => $productId,
                    'child_product_id' => $comp['child_product_id'],
                    'quantity_required' => $comp['quantity_required']
                ]);
            }
            DB::connection('tenant')->commit();
            return $this->success($inserted, 'BOM updated successfully.');
        } catch (\Exception $e) {
            DB::connection('tenant')->rollBack();
            return $this->error('Failed to update components: ' . $e->getMessage(), 500);
        }
    }

    // Assembly Execution
    public function assemble(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => 'required|uuid|exists:tenant.products,id',
            'warehouse_id' => 'required|uuid|exists:tenant.warehouses,id',
            'quantity' => 'required|numeric|min:0.001',
            'type' => 'required|in:assemble,disassemble', // assemble = +product, -raw // disassemble = -product, +raw
            'notes' => 'nullable|string'
        ]);

        $productId = $validated['product_id'];
        $warehouseId = $validated['warehouse_id'];
        $qty = (float) $validated['quantity'];
        $isAssemble = $validated['type'] === 'assemble';

        DB::connection('tenant')->beginTransaction();
        try {
            $components = ProductComponentModel::where('parent_product_id', $productId)->get();
            if ($components->isEmpty()) {
                throw new \Exception('This product has no components defined (BOM is empty).');
            }

            // Reference Number for the batch
            $ref = 'ASM-' . date('Ymd') . '-' . strtoupper(\Illuminate\Support\Str::random(4));

            // Variable to accumulate total cost of the assembled block
            $totalCostAdded = 0;

            // 1. Process Raw Materials
            foreach ($components as $component) {
                $rawQtyNeeded = $component->quantity_required * $qty;
                
                $rawStock = WarehouseProductModel::firstOrCreate(
                    ['warehouse_id' => $warehouseId, 'product_id' => $component->child_product_id],
                    ['quantity' => 0, 'average_cost' => 0]
                );

                $productInfo = ProductModel::find($component->child_product_id);
                $unitCost = $productInfo->cost_price;
                $componentTotalCost = $unitCost * $rawQtyNeeded;

                if ($isAssemble) {
                    // Deduct from raw stock
                    if ($rawStock->quantity < $rawQtyNeeded) {
                        throw new \Exception("Insufficient stock for component: {$productInfo->name}. Needed: {$rawQtyNeeded}, Available: {$rawStock->quantity}");
                    }
                    $rawStock->quantity -= $rawQtyNeeded;
                    $totalCostAdded += $componentTotalCost;
                    $movQty = -$rawQtyNeeded;
                } else {
                    // Return to raw stock
                    $rawStock->quantity += $rawQtyNeeded;
                    $movQty = $rawQtyNeeded;
                }

                $rawStock->save();

                // Log raw movement
                StockMovementModel::create([
                    'product_id' => $component->child_product_id,
                    'warehouse_id' => $warehouseId,
                    'type' => 'adjustment', // Assembly
                    'quantity' => $movQty,
                    'cost_per_unit' => $unitCost,
                    'reference_type' => 'assembly',
                    'reference_id' => null, // Typically link to an assembly record if existed
                    'notes' => "Component for $validated[type] $ref",
                    'created_by' => $request->user()?->id,
                ]);
            }

            // 2. Process Finished Good
            $finishedStock = WarehouseProductModel::firstOrCreate(
                ['warehouse_id' => $warehouseId, 'product_id' => $productId],
                ['quantity' => 0, 'average_cost' => 0]
            );

            // Cost calculation for Finished Good (sum of raw)
            // Can be simplified or stored on Product level too.
            $finishedUnitCost = $qty > 0 ? ($totalCostAdded / $qty) : 0;

            if ($isAssemble) {
                $finishedStock->quantity += $qty;
                $movQty = $qty;
            } else {
                if ($finishedStock->quantity < $qty) {
                    throw new \Exception("Insufficient assembled stock to disassemble. Needed: {$qty}, Available: {$finishedStock->quantity}");
                }
                $finishedStock->quantity -= $qty;
                $movQty = -$qty;
            }
            $finishedStock->save();

            // Log Finished good movement
            StockMovementModel::create([
                'product_id' => $productId,
                'warehouse_id' => $warehouseId,
                'type' => 'adjustment', // Assembly
                'quantity' => $movQty,
                'cost_per_unit' => $finishedUnitCost,
                'reference_type' => 'assembly',
                'reference_id' => null,
                'notes' => "Main item $validated[type] $ref",
                'created_by' => $request->user()?->id,
            ]);

            DB::connection('tenant')->commit();
            return $this->success(null, 'Product ' . $validated['type'] . ' processed successfully.', 201);
        } catch (\Exception $e) {
            DB::connection('tenant')->rollBack();
            return $this->error($e->getMessage(), 400);
        }
    }
}
