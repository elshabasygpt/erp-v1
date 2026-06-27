<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Inventory;

use App\Infrastructure\Eloquent\Models\StockWriteOffItemModel;
use App\Infrastructure\Eloquent\Models\StockWriteOffModel;
use App\Infrastructure\Eloquent\Models\WarehouseProductModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class StockWriteOffController extends BaseTenantController
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $writeOffs = StockWriteOffModel::query()
            ->where('tenant_id', $tenantId)
            ->with(['warehouse:id,name', 'items.product:id,name,sku'])
            ->withCount('items')
            ->orderByDesc('created_at')
            ->paginate(20);

        return $this->paginated($writeOffs->toArray(), 'Write-offs retrieved successfully');
    }

    public function store(Request $request): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $validated = $request->validate([
            'warehouse_id'         => 'required|uuid|exists:warehouses,id',
            'reason'               => 'required|string|max:1000',
            'reason_type'          => 'required|in:damaged,expired,obsolete,theft,other',
            'items'                => 'required|array|min:1',
            'items.*.product_id'   => 'required|uuid|exists:products,id',
            'items.*.quantity'     => 'required|numeric|min:0.01',
            'items.*.cost_per_unit'=> 'nullable|numeric|min:0',
            'items.*.notes'        => 'nullable|string|max:500',
        ]);

        try {
            $result = DB::connection('tenant')->transaction(function () use ($validated, $tenantId, $request) {
                $ref = 'WO-' . date('Ymd') . '-' . strtoupper(Str::random(5));

                $writeOff = StockWriteOffModel::create([
                    'tenant_id'        => $tenantId,
                    'reference_number' => $ref,
                    'warehouse_id'     => $validated['warehouse_id'],
                    'reason'           => $validated['reason'],
                    'reason_type'      => $validated['reason_type'],
                    'created_by'       => $request->user()?->id,
                ]);

                $totalCost = 0;
                foreach ($validated['items'] as $item) {
                    $warehouseProduct = WarehouseProductModel::query()
                        ->where('product_id', $item['product_id'])
                        ->where('warehouse_id', $validated['warehouse_id'])
                        ->lockForUpdate()
                        ->first();

                    $available = (float) ($warehouseProduct?->quantity ?? 0);
                    if ($available < (float) $item['quantity']) {
                        throw new \DomainException("المخزون غير كافٍ للمنتج: {$item['product_id']}. المتاح: {$available}");
                    }

                    $costPerUnit = (float) ($item['cost_per_unit'] ?? $warehouseProduct?->average_cost ?? 0);
                    $lineTotal   = $costPerUnit * (float) $item['quantity'];
                    $totalCost  += $lineTotal;

                    StockWriteOffItemModel::create([
                        'write_off_id'  => $writeOff->id,
                        'product_id'    => $item['product_id'],
                        'warehouse_id'  => $validated['warehouse_id'],
                        'quantity'      => $item['quantity'],
                        'cost_per_unit' => $costPerUnit,
                        'total_cost'    => $lineTotal,
                        'notes'         => $item['notes'] ?? null,
                    ]);

                    if ($warehouseProduct) {
                        $warehouseProduct->decrement('quantity', (float) $item['quantity']);
                    }
                }

                $writeOff->update(['total_cost' => $totalCost]);

                return $writeOff->load(['items.product:id,name,sku', 'warehouse:id,name']);
            });

            return $this->created($result->toArray(), 'Write-off recorded successfully');
        } catch (\DomainException $e) {
            return $this->error($e->getMessage(), 422);
        } catch (\Exception $e) {
            \Log::error('Write-off failed: ' . $e->getMessage());

            return $this->error('Failed to record write-off', 500);
        }
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $writeOff = StockWriteOffModel::query()
            ->where('tenant_id', $this->getTenantId($request))
            ->with(['items.product:id,name,sku', 'warehouse:id,name'])
            ->find($id);

        if (! $writeOff) {
            return $this->error('Write-off not found', 404);
        }

        return $this->success($writeOff->toArray());
    }
}
