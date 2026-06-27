<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Inventory;

use App\Infrastructure\Eloquent\Models\WarehouseModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WarehouseController extends BaseTenantController
{
    public function index(Request $request): JsonResponse
    {
        $warehouses = WarehouseModel::query()->where('tenant_id', $this->getTenantId($request))->with('branch')->withCount('warehouseProducts')->get();

        return $this->success(['warehouses' => $warehouses]);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $warehouse = WarehouseModel::query()->where('tenant_id', $this->getTenantId($request))->with('branch')->withCount('warehouseProducts')->findOrFail($id);

        return $this->success(['warehouse' => $warehouse]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'location' => 'nullable|string',
            'branch_id' => 'required|uuid|exists:tenant.branches,id',
            'is_default' => 'boolean',
            'is_active' => 'boolean',
        ]);

        $data['created_by'] = $request->user()?->id;

        $data['tenant_id'] = $this->getTenantId($request);
        $warehouse = WarehouseModel::query()->create($data);

        return $this->success(['warehouse' => $warehouse], 'Warehouse created successfully.', 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $warehouse = WarehouseModel::query()->where('tenant_id', $this->getTenantId($request))->findOrFail($id);

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'location' => 'nullable|string',
            'branch_id' => 'sometimes|uuid|exists:tenant.branches,id',
            'is_default' => 'boolean',
            'is_active' => 'boolean',
        ]);

        $data['updated_by'] = $request->user()?->id;

        $warehouse->update($data);

        return $this->success(['warehouse' => $warehouse], 'Warehouse updated successfully.');
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $warehouse = WarehouseModel::query()->where('tenant_id', $this->getTenantId($request))->findOrFail($id);

        if ($warehouse->is_default) {
            return $this->error('Cannot delete the default warehouse.', 403);
        }

        $warehouse->delete();

        return $this->success(null, 'Warehouse deleted successfully.');
    }
}
