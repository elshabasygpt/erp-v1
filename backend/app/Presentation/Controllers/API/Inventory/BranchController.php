<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Inventory;

use App\Infrastructure\Eloquent\Models\BranchModel;
use App\Presentation\Controllers\API\BaseController;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class BranchController extends BaseController
{
    public function index(Request $request): JsonResponse
    {
        $branches = BranchModel::when($request->search, function ($q, $search) {
            $q->where('name', 'like', "%{$search}%")
              ->orWhere('name_ar', 'like', "%{$search}%");
        })->get();

        return $this->success(['branches' => $branches]);
    }

    public function show(string $id): JsonResponse
    {
        $branch = BranchModel::findOrFail($id);
        return $this->success(['branch' => $branch]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'name_ar' => 'required|string|max:255',
            'location' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $data['created_by'] = $request->user()?->id;

        $branch = BranchModel::create($data);

        return $this->success(['branch' => $branch], 'Branch created successfully.', 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $branch = BranchModel::findOrFail($id);

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'name_ar' => 'sometimes|string|max:255',
            'location' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $data['updated_by'] = $request->user()?->id;

        $branch->update($data);

        return $this->success(['branch' => $branch], 'Branch updated successfully.');
    }

    public function destroy(string $id): JsonResponse
    {
        $branch = BranchModel::findOrFail($id);
        
        if ($branch->is_default) {
            return $this->error('Cannot delete the default branch.', 403);
        }

        $branch->delete();

        return $this->success(null, 'Branch deleted successfully.');
    }
}
