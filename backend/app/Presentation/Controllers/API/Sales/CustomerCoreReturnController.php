<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Sales;

use App\Infrastructure\Eloquent\Models\CustomerCoreReturnModel;
use App\Infrastructure\Eloquent\Models\CustomerCoreReturnItemModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CustomerCoreReturnController extends BaseTenantController
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $query = CustomerCoreReturnModel::query()
            ->where('tenant_id', $tenantId)
            ->with(['customer:id,name', 'warehouse:id,name'])
            ->withCount('items');
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($customerId = $request->query('customer_id')) {
            $query->where('customer_id', $customerId);
        }
        return $this->success($query->orderByDesc('created_at')->paginate(20));
    }

    public function store(Request $request): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $validated = $request->validate([
            'customer_id'                => 'required|uuid|exists:tenant.customers,id',
            'warehouse_id'               => 'required|uuid|exists:tenant.warehouses,id',
            'invoice_id'                 => 'nullable|uuid|exists:tenant.invoices,id',
            'notes'                      => 'nullable|string|max:1000',
            'items'                      => 'required|array|min:1',
            'items.*.product_id'         => 'required|uuid|exists:tenant.products,id',
            'items.*.quantity'           => 'required|numeric|min:0.01',
            'items.*.unit_deposit_value' => 'required|numeric|min:0',
            'items.*.condition'          => 'nullable|in:good,damaged,scrap',
            'items.*.notes'              => 'nullable|string|max:500',
        ]);

        $coreReturn = DB::connection('tenant')->transaction(function () use ($tenantId, $validated, $request) {
            $total = 0;
            foreach ($validated['items'] as $item) {
                $total += (float) $item['unit_deposit_value'] * (float) $item['quantity'];
            }

            $returnNumber = 'CCR-' . strtoupper(Str::random(8));
            $coreReturn = CustomerCoreReturnModel::create([
                'tenant_id'           => $tenantId,
                'return_number'       => $returnNumber,
                'customer_id'         => $validated['customer_id'],
                'warehouse_id'        => $validated['warehouse_id'],
                'invoice_id'          => $validated['invoice_id'] ?? null,
                'status'              => 'pending',
                'total_deposit_value' => $total,
                'notes'               => $validated['notes'] ?? null,
                'created_by'          => $request->user()?->id,
            ]);

            foreach ($validated['items'] as $item) {
                CustomerCoreReturnItemModel::create([
                    'tenant_id'          => $tenantId,
                    'core_return_id'     => $coreReturn->id,
                    'product_id'         => $item['product_id'],
                    'quantity'           => $item['quantity'],
                    'condition'          => $item['condition'] ?? 'good',
                    'unit_deposit_value' => $item['unit_deposit_value'],
                    'total'              => (float) $item['unit_deposit_value'] * (float) $item['quantity'],
                    'notes'              => $item['notes'] ?? null,
                ]);
            }

            return $coreReturn;
        });

        $coreReturn->load(['items.product:id,name,sku', 'customer:id,name', 'warehouse:id,name', 'creator:id,name']);
        return $this->success($coreReturn, 'Customer core return created', 201);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $coreReturn = CustomerCoreReturnModel::query()
            ->where('tenant_id', $tenantId)
            ->with([
                'items.product:id,name,sku,has_core_charge,core_charge_amount',
                'customer:id,name',
                'warehouse:id,name',
                'creator:id,name',
            ])
            ->findOrFail($id);
        return $this->success($coreReturn);
    }

    /** Mark items as physically received. Transitions: pending -> received. */
    public function receive(Request $request, string $id): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $validated = $request->validate([
            'items'                      => 'required|array|min:1',
            'items.*.id'                 => 'required|uuid',
            'items.*.condition'          => 'required|in:good,damaged,scrap',
            'items.*.unit_deposit_value' => 'nullable|numeric|min:0',
        ]);

        try {
            $coreReturn = DB::connection('tenant')->transaction(function () use ($tenantId, $id, $validated) {
                $coreReturn = CustomerCoreReturnModel::query()
                    ->where('tenant_id', $tenantId)
                    ->where('status', 'pending')
                    ->lockForUpdate()
                    ->findOrFail($id);

                // Batch-load all items for this return — eliminates N+1
                $incomingIds = array_column($validated['items'], 'id');
                $items = CustomerCoreReturnItemModel::query()
                    ->where('tenant_id', $tenantId)
                    ->where('core_return_id', $id)
                    ->whereIn('id', $incomingIds)
                    ->lockForUpdate()
                    ->get()
                    ->keyBy('id');

                // Verify all submitted item IDs actually belong to this return
                foreach ($incomingIds as $itemId) {
                    if (! $items->has($itemId)) {
                        throw new \DomainException("Item {$itemId} does not belong to this core return.");
                    }
                }

                foreach ($validated['items'] as $itemData) {
                    $item = $items->get($itemData['id']);

                    $unitVal = isset($itemData['unit_deposit_value'])
                        ? (float) $itemData['unit_deposit_value']
                        : (float) $item->unit_deposit_value;

                    if ($itemData['condition'] === 'scrap') {
                        $unitVal = 0;
                    }

                    $item->update([
                        'condition'          => $itemData['condition'],
                        'unit_deposit_value' => $unitVal,
                        'total'              => $unitVal * (float) $item->quantity,
                    ]);
                }

                // Re-sum ALL items from DB — authoritative total after condition overrides
                $newTotal = CustomerCoreReturnItemModel::query()
                    ->where('tenant_id', $tenantId)
                    ->where('core_return_id', $id)
                    ->sum('total');

                $coreReturn->update([
                    'status'              => 'received',
                    'total_deposit_value' => $newTotal,
                    'received_at'         => now(),
                ]);

                return $coreReturn;
            });
        } catch (\DomainException $e) {
            return $this->error($e->getMessage(), 422);
        }

        return $this->success($coreReturn->fresh(), 'Core return marked as received');
    }

    /** Issue credit/refund. Transitions: received -> credited. */
    public function credit(Request $request, string $id): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $validated = $request->validate(['refund_method' => 'required|in:cash,store_credit,bank_transfer']);

        try {
            $coreReturn = DB::connection('tenant')->transaction(function () use ($tenantId, $id, $validated) {
                $coreReturn = CustomerCoreReturnModel::query()
                    ->where('tenant_id', $tenantId)
                    ->lockForUpdate()
                    ->findOrFail($id);

                if ($coreReturn->status !== 'received') {
                    throw new \DomainException("Core return cannot be credited from status '{$coreReturn->status}'.");
                }

                $coreReturn->update([
                    'status'        => 'credited',
                    'refund_method' => $validated['refund_method'],
                    'credited_at'   => now(),
                ]);

                return $coreReturn;
            });
        } catch (\DomainException $e) {
            return $this->error($e->getMessage(), 422);
        }

        return $this->success($coreReturn->fresh(), 'Core return credited successfully');
    }
}
