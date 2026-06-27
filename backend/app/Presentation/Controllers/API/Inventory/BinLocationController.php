<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Inventory;

use App\Infrastructure\Eloquent\Models\WarehouseBinLocationModel;
use App\Infrastructure\Eloquent\Models\WarehouseProductModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BinLocationController extends BaseTenantController
{
    /**
     * List all bin locations for a warehouse, with optional zone/rack/shelf filters.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'warehouse_id' => 'required|uuid|exists:tenant.warehouses,id',
            'zone'         => 'nullable|string',
            'rack'         => 'nullable|string',
            'shelf'        => 'nullable|string',
            'is_active'    => 'nullable|boolean',
        ]);

        $tenantId = $this->getTenantId($request);

        $query = WarehouseBinLocationModel::query()
            ->where('tenant_id', $tenantId)
            ->where('warehouse_id', $request->warehouse_id)
            ->when($request->filled('zone'),      fn ($q) => $q->where('zone', $request->zone))
            ->when($request->filled('rack'),      fn ($q) => $q->where('rack', $request->rack))
            ->when($request->filled('shelf'),     fn ($q) => $q->where('shelf', $request->shelf))
            ->when($request->filled('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderByRaw('zone ASC, rack ASC, shelf ASC, bin ASC');

        $binLocations = $query->get();

        return $this->success([
            'bin_locations' => $binLocations,
            'zones'         => $this->getDistinctValues($tenantId, $request->warehouse_id, 'zone'),
        ]);
    }

    /**
     * Zone-tree view: Warehouse → Zones → Racks → Shelves → Bins grouped.
     */
    public function tree(Request $request): JsonResponse
    {
        $request->validate([
            'warehouse_id' => 'required|uuid|exists:tenant.warehouses,id',
        ]);

        $tenantId = $this->getTenantId($request);

        $bins = WarehouseBinLocationModel::query()
            ->where('tenant_id', $tenantId)
            ->where('warehouse_id', $request->warehouse_id)
            ->where('is_active', true)
            ->orderByRaw('zone ASC, rack ASC, shelf ASC, bin ASC')
            ->get();

        $tree = [];
        foreach ($bins as $bin) {
            $z = $bin->zone ?? '__none__';
            $r = $bin->rack ?? '__none__';
            $s = $bin->shelf ?? '__none__';

            $tree[$z][$r][$s][] = [
                'id'        => $bin->id,
                'bin'       => $bin->bin,
                'full_path' => $bin->full_path,
                'name'      => $bin->name,
                'capacity'  => $bin->capacity,
            ];
        }

        return $this->success(['tree' => $tree]);
    }

    /**
     * Show a single bin location with current stock summary.
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $tenantId = $this->getTenantId($request);

        $binLocation = WarehouseBinLocationModel::query()
            ->where('tenant_id', $tenantId)
            ->with('warehouse:id,name')
            ->findOrFail($id);

        $stock = WarehouseProductModel::query()
            ->where('bin_location_id', $id)
            ->with('product:id,name,name_ar,sku,barcode,unit_of_measure')
            ->get()
            ->map(fn ($wp) => [
                'product'           => $wp->product,
                'quantity'          => $wp->quantity,
                'reserved_quantity' => $wp->reserved_quantity,
                'available'         => (float) $wp->quantity - (float) $wp->reserved_quantity,
            ]);

        return $this->success([
            'bin_location' => $binLocation,
            'stock'        => $stock,
            'stock_count'  => $stock->count(),
        ]);
    }

    /**
     * Create a new bin location.
     */
    public function store(Request $request): JsonResponse
    {
        $tenantId = $this->getTenantId($request);

        $data = $request->validate([
            'warehouse_id' => 'required|uuid|exists:tenant.warehouses,id',
            'zone'         => 'nullable|string|max:50',
            'rack'         => 'nullable|string|max:50',
            'shelf'        => 'nullable|string|max:50',
            'bin'          => 'nullable|string|max:50',
            'name'         => 'nullable|string|max:255',
            'description'  => 'nullable|string',
            'is_active'    => 'boolean',
            'capacity'     => 'nullable|numeric|min:0',
        ]);

        $this->assertAtLeastOneLevel($data);

        $this->assertUniqueInWarehouse($tenantId, $data, null);

        $data['tenant_id']  = $tenantId;
        $data['created_by'] = $request->user()?->id;

        $binLocation = WarehouseBinLocationModel::query()->create($data);

        return $this->success(['bin_location' => $binLocation], 'Bin location created successfully.', 201);
    }

    /**
     * Update a bin location (only metadata; zone/rack/shelf/bin are immutable if stock exists).
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $tenantId = $this->getTenantId($request);

        $binLocation = WarehouseBinLocationModel::query()
            ->where('tenant_id', $tenantId)
            ->findOrFail($id);

        $hasStock = WarehouseProductModel::query()
            ->where('bin_location_id', $id)
            ->where('quantity', '>', 0)
            ->exists();

        $rules = [
            'name'        => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'is_active'   => 'boolean',
            'capacity'    => 'nullable|numeric|min:0',
        ];

        // Allow changing coordinates only when bin is empty
        if (! $hasStock) {
            $rules['zone']  = 'nullable|string|max:50';
            $rules['rack']  = 'nullable|string|max:50';
            $rules['shelf'] = 'nullable|string|max:50';
            $rules['bin']   = 'nullable|string|max:50';
        }

        $data = $request->validate($rules);

        if (! $hasStock && $request->hasAny(['zone', 'rack', 'shelf', 'bin'])) {
            $coordinates = array_merge(
                ['zone' => $binLocation->zone, 'rack' => $binLocation->rack, 'shelf' => $binLocation->shelf, 'bin' => $binLocation->bin],
                $request->only(['zone', 'rack', 'shelf', 'bin'])
            );
            $this->assertUniqueInWarehouse($tenantId, array_merge(['warehouse_id' => $binLocation->warehouse_id], $coordinates), $id);
        }

        $data['updated_by'] = $request->user()?->id;
        $binLocation->update($data);

        return $this->success(['bin_location' => $binLocation->fresh()], 'Bin location updated successfully.');
    }

    /**
     * Delete a bin location (only if empty).
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $tenantId = $this->getTenantId($request);

        $binLocation = WarehouseBinLocationModel::query()
            ->where('tenant_id', $tenantId)
            ->findOrFail($id);

        $hasStock = WarehouseProductModel::query()
            ->where('bin_location_id', $id)
            ->where('quantity', '>', 0)
            ->exists();

        if ($hasStock) {
            return $this->error('Cannot delete a bin location that contains stock. Move stock first.', 422);
        }

        // Unlink any references before deleting
        WarehouseProductModel::query()->where('bin_location_id', $id)->update(['bin_location_id' => null]);

        $binLocation->delete();

        return $this->success(null, 'Bin location deleted successfully.');
    }

    /**
     * Bulk-create bin locations for a warehouse based on a zone/rack/shelf/bin range pattern.
     *
     * Example: zone=A, racks=[R1,R2,R3], shelves=[S1,S2], bins=[B1..B5]
     * Generates all combinations.
     */
    public function bulkGenerate(Request $request): JsonResponse
    {
        $tenantId = $this->getTenantId($request);

        $data = $request->validate([
            'warehouse_id' => 'required|uuid|exists:tenant.warehouses,id',
            'zones'        => 'required|array|min:1|max:26',
            'zones.*'      => 'string|max:50',
            'racks'        => 'nullable|array|max:50',
            'racks.*'      => 'string|max:50',
            'shelves'      => 'nullable|array|max:50',
            'shelves.*'    => 'string|max:50',
            'bins'         => 'nullable|array|max:100',
            'bins.*'       => 'string|max:50',
            'capacity'     => 'nullable|numeric|min:0',
        ]);

        $zones   = $data['zones'];
        $racks   = $data['racks']   ?? [null];
        $shelves = $data['shelves'] ?? [null];
        $bins    = $data['bins']    ?? [null];

        $toCreate = [];
        $skipped  = 0;
        $userId   = $request->user()?->id;
        $now      = now();

        foreach ($zones as $zone) {
            foreach ($racks as $rack) {
                foreach ($shelves as $shelf) {
                    foreach ($bins as $bin) {
                        $exists = WarehouseBinLocationModel::withTrashed()
                            ->where('tenant_id', $tenantId)
                            ->where('warehouse_id', $data['warehouse_id'])
                            ->where('zone', $zone)
                            ->where('rack', $rack)
                            ->where('shelf', $shelf)
                            ->where('bin', $bin)
                            ->exists();

                        if ($exists) {
                            $skipped++;
                            continue;
                        }

                        $toCreate[] = [
                            'id'           => (string) \Illuminate\Support\Str::uuid(),
                            'tenant_id'    => $tenantId,
                            'warehouse_id' => $data['warehouse_id'],
                            'zone'         => $zone,
                            'rack'         => $rack,
                            'shelf'        => $shelf,
                            'bin'          => $bin,
                            'is_active'    => true,
                            'capacity'     => $data['capacity'] ?? null,
                            'created_by'   => $userId,
                            'created_at'   => $now,
                            'updated_at'   => $now,
                        ];
                    }
                }
            }
        }

        if (! empty($toCreate)) {
            foreach (array_chunk($toCreate, 100) as $chunk) {
                WarehouseBinLocationModel::query()->insert($chunk);
            }
        }

        return $this->success([
            'created' => count($toCreate),
            'skipped' => $skipped,
        ], count($toCreate) . ' bin location(s) created.', 201);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function assertAtLeastOneLevel(array $data): void
    {
        $filled = array_filter([$data['zone'] ?? null, $data['rack'] ?? null, $data['shelf'] ?? null, $data['bin'] ?? null]);
        if (empty($filled)) {
            abort(422, 'At least one of zone, rack, shelf, or bin must be provided.');
        }
    }

    private function assertUniqueInWarehouse(string $tenantId, array $data, ?string $excludeId): void
    {
        $query = WarehouseBinLocationModel::query()
            ->where('tenant_id', $tenantId)
            ->where('warehouse_id', $data['warehouse_id'])
            ->where('zone', $data['zone'] ?? null)
            ->where('rack', $data['rack'] ?? null)
            ->where('shelf', $data['shelf'] ?? null)
            ->where('bin', $data['bin'] ?? null);

        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        if ($query->exists()) {
            abort(422, 'A bin location with the same zone/rack/shelf/bin already exists in this warehouse.');
        }
    }

    private function getDistinctValues(string $tenantId, string $warehouseId, string $column): array
    {
        return WarehouseBinLocationModel::query()
            ->where('tenant_id', $tenantId)
            ->where('warehouse_id', $warehouseId)
            ->where('is_active', true)
            ->whereNotNull($column)
            ->distinct()
            ->orderBy($column)
            ->pluck($column)
            ->toArray();
    }
}
