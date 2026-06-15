<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Inventory;

use App\Presentation\Controllers\API\BaseTenantController;
use App\Infrastructure\Eloquent\Models\UnitModel;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Infrastructure\Eloquent\Models\ProductModel;

class UnitController extends BaseTenantController
{
    public function index(Request $request): JsonResponse
    {
        $units = UnitModel::where('tenant_id', $this->getTenantId($request))->get();

        return $this->success($units->toArray(), 'Units retrieved successfully');
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'name_ar' => 'required|string|max:255',
            'symbol' => 'nullable|string|max:50',
        ]);

        $validated['tenant_id'] = $this->getTenantId($request);
        $validated['created_by'] = $request->user()?->id;

        $unit = UnitModel::create($validated);

        return $this->success($unit->toArray(), 'Unit created successfully', 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $unit = UnitModel::where('tenant_id', $this->getTenantId($request))->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'name_ar' => 'sometimes|required|string|max:255',
            'symbol' => 'nullable|string|max:50',
            'is_active' => 'boolean',
        ]);

        $validated['updated_by'] = $request->user()?->id;

        $unit->update($validated);

        return $this->success($unit->toArray(), 'Unit updated successfully');
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $unit = UnitModel::where('tenant_id', $this->getTenantId($request))->findOrFail($id);
        
        $inUse = ProductModel::where('tenant_id', $this->getTenantId($request))
            ->where('unit_of_measure', $id)
            ->exists();
            
        if ($inUse) {
            return $this->error('Cannot delete unit. It is currently in use by one or more products.', 422);
        }

        // Soft delete
        $unit->delete();

        return $this->success([], 'Unit deleted successfully');
    }
}
