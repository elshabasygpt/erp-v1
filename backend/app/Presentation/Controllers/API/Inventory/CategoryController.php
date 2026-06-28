<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Inventory;

use App\Infrastructure\Eloquent\Models\CategoryModel;
use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use App\Presentation\Controllers\API\Concerns\HandlesImageUploads;

class CategoryController extends BaseTenantController
{
    use HandlesImageUploads;

    public function index(Request $request): JsonResponse
    {
        $categories = CategoryModel::query()->where('tenant_id', $this->getTenantId($request))
            ->whereNull('parent_id')
            ->with(['children' => function ($query) use ($request) {
                $query->where('tenant_id', $this->getTenantId($request));
            }])
            ->get();

        return $this->success($categories->toArray(), 'Categories retrieved successfully');
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'name_ar' => 'required|string|max:255',
            'parent_id' => [
                'nullable',
                'uuid',
                Rule::exists('tenant.categories', 'id')->where('tenant_id', $this->getTenantId($request)),
            ],
            'image' => 'nullable|file|max:2048',
            'discount' => 'nullable|numeric|min:0|max:100',
        ]);

        if ($request->hasFile('image')) {
            $validated['image_url'] = $this->storeUploadedImage(
                $request->file('image'),
                (string) $this->getTenantId($request),
                'categories'
            );
        }

        $validated['tenant_id'] = $this->getTenantId($request);
        $validated['created_by'] = $request->user()?->id;

        $category = CategoryModel::query()->create($validated);

        return $this->success($category->load('children')->toArray(), 'Category created successfully', 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $category = CategoryModel::query()->where('tenant_id', $this->getTenantId($request))->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'name_ar' => 'sometimes|required|string|max:255',
            'parent_id' => [
                'nullable',
                'uuid',
                Rule::exists('tenant.categories', 'id')->where('tenant_id', $this->getTenantId($request)),
            ],
            'image' => 'nullable|file|max:2048',
            'discount' => 'nullable|numeric|min:0|max:100',
            'is_active' => 'boolean',
        ]);

        if ($request->hasFile('image')) {
            $validated['image_url'] = $this->storeUploadedImage(
                $request->file('image'),
                (string) $this->getTenantId($request),
                'categories'
            );
        }

        $validated['updated_by'] = $request->user()?->id;

        $category->update($validated);

        return $this->success($category->load('children')->toArray(), 'Category updated successfully');
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $category = CategoryModel::query()->where('tenant_id', $this->getTenantId($request))->findOrFail($id);

        $inUse = ProductModel::query()->where('tenant_id', $this->getTenantId($request))
            ->where('category_id', $id)
            ->exists();

        if ($inUse) {
            return $this->error('Cannot delete category. It is currently in use by one or more products.', 422);
        }

        // Soft delete
        $category->delete();

        return $this->success([], 'Category deleted successfully');
    }
}
