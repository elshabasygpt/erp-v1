<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Inventory;

use App\Infrastructure\Eloquent\Models\WarehouseModel;
use App\Presentation\Controllers\API\BaseController;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class WarehouseController extends BaseController
{
    public function index(Request $request): JsonResponse
    {
        $warehouses = WarehouseModel::with('branch')->get();
        return $this->success(['warehouses' => $warehouses]);
    }

    public function show(string $id): JsonResponse
    {
        $warehouse = WarehouseModel::with('branch')->findOrFail($id);
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

        $warehouse = WarehouseModel::create($data);

        return $this->success(['warehouse' => $warehouse], 'Warehouse created successfully.', 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $warehouse = WarehouseModel::findOrFail($id);

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

    public function destroy(string $id): JsonResponse
    {
        $warehouse = WarehouseModel::findOrFail($id);
        
        if ($warehouse->is_default) {
            return $this->error('Cannot delete the default warehouse.', 403);
        }

        $warehouse->delete();

        return $this->success(null, 'Warehouse deleted successfully.');
    }
}
