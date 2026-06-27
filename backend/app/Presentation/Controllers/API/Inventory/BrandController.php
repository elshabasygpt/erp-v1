<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Inventory;

use App\Infrastructure\Eloquent\Models\BrandModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class BrandController extends BaseTenantController
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $query = BrandModel::query()->where('tenant_id', $tenantId);

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('name_ar', 'like', "%{$search}%");
            });
        }

        $brands = $query->orderBy('name')->get();

        return $this->success($brands);
    }

    public function store(Request $request): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        
        $request->validate([
            'name' => 'required|string|max:255',
            'name_ar' => 'nullable|string|max:255',
            'country_of_origin' => 'nullable|string|max:100',
            'image' => 'nullable|image|max:2048',
        ]);

        $imageUrl = null;
        if ($request->hasFile('image')) {
            $file = $request->file('image');
            $filename = time().'_'.uniqid().'.'.$file->extension();
            $file->move(public_path("uploads/tenant_{$tenantId}/brands"), $filename);
            $imageUrl = "/uploads/tenant_{$tenantId}/brands/{$filename}";
        }

        $brand = BrandModel::create([
            'id' => Str::uuid()->toString(),
            'tenant_id' => $tenantId,
            'name' => $request->name,
            'name_ar' => $request->name_ar,
            'country_of_origin' => $request->country_of_origin,
            'image_url' => $imageUrl,
        ]);

        return $this->success($brand, 'Brand created successfully', 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $brand = BrandModel::where('tenant_id', $tenantId)->findOrFail($id);

        $request->validate([
            'name' => 'nullable|string|max:255',
            'name_ar' => 'nullable|string|max:255',
            'country_of_origin' => 'nullable|string|max:100',
            'image' => 'nullable|image|max:2048',
        ]);

        if ($request->hasFile('image')) {
            $file = $request->file('image');
            $filename = time().'_'.uniqid().'.'.$file->extension();
            $file->move(public_path("uploads/tenant_{$tenantId}/brands"), $filename);
            $brand->image_url = "/uploads/tenant_{$tenantId}/brands/{$filename}";
        }

        if ($request->has('name')) $brand->name = $request->name;
        if ($request->has('name_ar')) $brand->name_ar = $request->name_ar;
        if ($request->has('country_of_origin')) $brand->country_of_origin = $request->country_of_origin;

        $brand->save();

        return $this->success($brand, 'Brand updated successfully');
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $brand = BrandModel::where('tenant_id', $tenantId)->findOrFail($id);
        
        $brand->delete();

        return $this->success(null, 'Brand deleted successfully');
    }
}
