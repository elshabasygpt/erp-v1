<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Inventory;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Presentation\Controllers\API\BaseController;
use App\Infrastructure\Eloquent\Models\StockMovementModel;
use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\WarehouseModel;

class StockMovementController extends BaseController
{
    /**
     * GET /api/inventory/movements
     * List stock movements with optional filters.
     */
    public function index(Request $request): JsonResponse
    {
        $query = StockMovementModel::with(['product', 'warehouse', 'creator'])
            ->orderBy('created_at', 'desc');

        // Filters
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }
        if ($request->filled('product_id')) {
            $query->where('product_id', $request->product_id);
        }
        if ($request->filled('warehouse_id')) {
            $query->where('warehouse_id', $request->warehouse_id);
        }
        if ($request->filled('from')) {
            $query->whereDate('created_at', '>=', $request->from);
        }
        if ($request->filled('to')) {
            $query->whereDate('created_at', '<=', $request->to);
        }

        $perPage = min((int) ($request->per_page ?? 50), 200);
        $movements = $query->paginate($perPage);

        return $this->paginated($movements->toArray(), 'Stock movements retrieved');
    }

    /**
     * GET /api/inventory/movements/{id}
     */
    public function show(int $id): JsonResponse
    {
        $movement = StockMovementModel::with(['product', 'warehouse', 'creator'])
            ->findOrFail($id);

        return $this->success($movement, 'Movement retrieved');
    }

    /**
     * POST /api/inventory/movements
     * Manually record a stock movement (adjustment / write-off).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id'    => 'required|integer|exists:products,id',
            'warehouse_id'  => 'nullable|integer|exists:warehouses,id',
            'type'          => 'required|in:incoming,outgoing,adjustment,return,transfer',
            'quantity'      => 'required|numeric|min:0.01',
            'cost_per_unit' => 'nullable|numeric|min:0',
            'reference_type'=> 'nullable|string|max:50',
            'reference_id'  => 'nullable|integer',
            'notes'         => 'nullable|string|max:500',
        ]);

        $validated['created_by'] = auth()->id();

        $movement = StockMovementModel::create($validated);

        // Update product stock (for manual adjustments)
        if (in_array($validated['type'], ['incoming', 'return'])) {
            $this->adjustProductStock($validated['product_id'], $validated['quantity'], 'add');
        } elseif ($validated['type'] === 'outgoing') {
            $this->adjustProductStock($validated['product_id'], $validated['quantity'], 'subtract');
        } elseif ($validated['type'] === 'adjustment') {
            // Adjustment: quantity can be positive (add) or negative (reduce)
            // We store absolute value and handle sign from request
            $delta = $request->boolean('subtract') ? -abs($validated['quantity']) : abs($validated['quantity']);
            $this->adjustProductStock($validated['product_id'], $delta, 'delta');
        }

        return $this->success(
            $movement->load(['product', 'warehouse']),
            'Stock movement recorded',
            201
        );
    }

    /**
     * GET /api/inventory/movements/summary
     * Aggregated summary statistics.
     */
    public function summary(Request $request): JsonResponse
    {
        $query = StockMovementModel::query();

        if ($request->filled('from')) {
            $query->whereDate('created_at', '>=', $request->from);
        }
        if ($request->filled('to')) {
            $query->whereDate('created_at', '<=', $request->to);
        }

        $summary = [
            'total_incoming'   => (clone $query)->where('type', 'incoming')->sum('quantity'),
            'total_outgoing'   => (clone $query)->where('type', 'outgoing')->sum('quantity'),
            'total_adjustments'=> (clone $query)->where('type', 'adjustment')->count(),
            'total_returns'    => (clone $query)->where('type', 'return')->sum('quantity'),
            'total_movements'  => $query->count(),
        ];

        return $this->success($summary, 'Summary retrieved');
    }

    // ── Private helpers ────────────────────────────────────────────

    private function adjustProductStock(int $productId, float $quantity, string $mode): void
    {
        $product = ProductModel::find($productId);
        if (!$product) return;

        match ($mode) {
            'add'      => $product->increment('stock_quantity', $quantity),
            'subtract' => $product->decrement('stock_quantity', $quantity),
            'delta'    => $product->increment('stock_quantity', $quantity), // handles negatives
            default    => null,
        };
    }
}
