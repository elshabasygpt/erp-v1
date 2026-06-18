<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Inventory;

use App\Application\Services\InventoryService;
use App\Infrastructure\Eloquent\Models\StockMovementModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class StockMovementController extends BaseTenantController
{
    public function __construct(private InventoryService $inventoryService) {}

    /**
     * GET /api/inventory/movements
     * List stock movements with optional filters.
     */
    public function index(Request $request): JsonResponse
    {
        $query = StockMovementModel::query()->where('tenant_id', $this->getTenantId($request))->with(['product', 'warehouse', 'creator'])
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
    public function show(Request $request, string $id): JsonResponse
    {
        $movement = StockMovementModel::query()->where('tenant_id', $this->getTenantId($request))->with(['product', 'warehouse', 'creator'])
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
            'product_id' => [
                'required',
                'uuid',
                Rule::exists('tenant.products', 'id')->where('tenant_id', $this->getTenantId($request)),
            ],
            'warehouse_id' => [
                'nullable',
                'uuid',
                Rule::exists('tenant.warehouses', 'id')->where('tenant_id', $this->getTenantId($request)),
            ],
            'type' => 'required|in:incoming,outgoing,adjustment,return,transfer',
            'quantity' => 'required|numeric|min:0.01',
            'cost_per_unit' => 'nullable|numeric|min:0',
            'reference_type' => 'nullable|string|max:50',
            'reference_id' => 'nullable|uuid',
            'notes' => 'nullable|string|max:500',
        ]);

        $validated['created_by'] = auth()->id();

        $validated['tenant_id'] = $this->getTenantId($request);
        $movement = StockMovementModel::query()->create($validated);

        // Update product stock (for manual adjustments)
        if (in_array($validated['type'], ['incoming', 'return'])) {
            $this->inventoryService->adjustProductStock($this->getTenantId($request), $validated['product_id'], (float) $validated['quantity'], 'add');
        } elseif ($validated['type'] === 'outgoing') {
            $this->inventoryService->adjustProductStock($this->getTenantId($request), $validated['product_id'], (float) $validated['quantity'], 'subtract');
        } elseif ($validated['type'] === 'adjustment') {
            // Adjustment: quantity can be positive (add) or negative (reduce)
            // We store absolute value and handle sign from request
            $delta = $request->boolean('subtract') ? -abs($validated['quantity']) : abs($validated['quantity']);
            $this->inventoryService->adjustProductStock($this->getTenantId($request), $validated['product_id'], (float) $delta, 'delta');
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
        $query = StockMovementModel::query()->where('tenant_id', $this->getTenantId($request));

        if ($request->filled('from')) {
            $query->whereDate('created_at', '>=', $request->from);
        }
        if ($request->filled('to')) {
            $query->whereDate('created_at', '<=', $request->to);
        }

        $summary = [
            'total_incoming' => (clone $query)->where('type', 'incoming')->sum('quantity'),
            'total_outgoing' => (clone $query)->where('type', 'outgoing')->sum('quantity'),
            'total_adjustments' => (clone $query)->where('type', 'adjustment')->count(),
            'total_returns' => (clone $query)->where('type', 'return')->sum('quantity'),
            'total_movements' => $query->count(),
        ];

        return $this->success($summary, 'Summary retrieved');
    }
}
