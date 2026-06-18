<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Inventory;

use App\Domain\Inventory\Repositories\ProductRepositoryInterface;
use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProductController extends BaseTenantController
{
    public function __construct(private ProductRepositoryInterface $productRepository) {}

    public function index(Request $request): JsonResponse
    {
        $filters = $request->only(['search', 'is_active']);
        $filters['tenant_id'] = $this->getTenantId($request);

        return $this->paginated($this->productRepository->paginate((int) $request->get('per_page', 15), $filters));
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $product = ProductModel::query()->where(['tenant_id' => $this->getTenantId($request)])->with(['warehouseStocks', 'units'])->find($id);

        return $product ? $this->success($product->toArray()) : $this->error('Product not found.', 404);
    }

    public function search(Request $request): JsonResponse
    {
        $results = $this->productRepository->search($request->get('q', ''));

        return $this->success($results);
    }

    public function lowStock(Request $request): JsonResponse
    {
        $warehouseId = $request->get('warehouse_id');
        if (! $warehouseId) {
            return $this->error('warehouse_id is required.', 422);
        }

        return $this->success($this->productRepository->getLowStockProducts($warehouseId));
    }

    public function scanBarcode(string $barcode): JsonResponse
    {
        $product = $this->productRepository->findByBarcode($barcode);

        return $product ? $this->success($product->toArray()) : $this->error('Product not found.', 404);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'sku' => 'required|string|unique:products,sku',
            'barcode' => 'nullable|string|unique:products,barcode',
            'name' => 'required|string',
            'name_ar' => 'nullable|string',
            'description' => 'nullable|string',
            'selling_price' => 'required|numeric|min:0',
            'wholesale_price' => 'nullable|numeric|min:0',
            'semi_wholesale_price' => 'nullable|numeric|min:0',
            'purchase_price' => 'nullable|numeric|min:0',
            'tax_rate' => 'nullable|numeric|min:0',
            'is_active' => 'boolean',
            'category_id' => 'nullable|string',
            'unit_of_measure' => 'nullable|string',
            'stock_alert_level' => 'nullable|integer|min:0',
            'has_core_charge' => 'nullable|boolean',
            'core_charge_amount' => 'nullable|numeric|min:0',
            'is_kit' => 'nullable|boolean',
            'image_url' => 'nullable|string',
            'units' => 'nullable|array',
            'units.*.unit_name' => 'required|string',
            'units.*.conversion_factor' => 'required|numeric|min:0.0001',
            'units.*.barcode' => 'nullable|string',
            'units.*.sell_price' => 'nullable|numeric|min:0',
        ]);

        $validated['id'] = Str::uuid()->toString();
        $validated['is_active'] = $validated['is_active'] ?? true;
        if (! isset($validated['name_ar'])) {
            $validated['name_ar'] = $validated['name'];
        }
        if (isset($validated['selling_price'])) {
            $validated['sell_price'] = $validated['selling_price'];
        }
        if (isset($validated['purchase_price'])) {
            $validated['cost_price'] = $validated['purchase_price'];
        }
        if (isset($validated['tax_rate'])) {
            $validated['vat_rate'] = $validated['tax_rate'];
        }

        if (! array_key_exists('wholesale_price', $validated) && isset($validated['sell_price'])) {
            $validated['wholesale_price'] = round($validated['sell_price'] * 0.80, 2);
        }
        if (! array_key_exists('semi_wholesale_price', $validated) && isset($validated['sell_price'])) {
            $validated['semi_wholesale_price'] = round($validated['sell_price'] * 0.90, 2);
        }

        $validated['tenant_id'] = $this->getTenantId($request);
        $product = ProductModel::query()->create($validated);

        if (! empty($validated['units'])) {
            foreach ($validated['units'] as $unit) {
                $product->units()->create($unit);
            }
        }

        $product->load(['units', 'warehouseStocks']);

        return $this->success($product, 'Product created successfully', 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $product = ProductModel::query()->where(['tenant_id' => $this->getTenantId($request)])->find($id);

        if (! $product) {
            return $this->error('Product not found', 404);
        }

        $validated = $request->validate([
            'sku' => 'sometimes|required|string|unique:products,sku,'.$id,
            'barcode' => 'nullable|string|unique:products,barcode,'.$id,
            'name' => 'sometimes|required|string',
            'name_ar' => 'nullable|string',
            'description' => 'nullable|string',
            'selling_price' => 'sometimes|required|numeric|min:0',
            'wholesale_price' => 'nullable|numeric|min:0',
            'semi_wholesale_price' => 'nullable|numeric|min:0',
            'purchase_price' => 'nullable|numeric|min:0',
            'tax_rate' => 'nullable|numeric|min:0',
            'is_active' => 'boolean',
            'category_id' => 'nullable|string',
            'unit_of_measure' => 'nullable|string',
            'stock_alert_level' => 'nullable|integer|min:0',
            'has_core_charge' => 'nullable|boolean',
            'core_charge_amount' => 'nullable|numeric|min:0',
            'is_kit' => 'nullable|boolean',
            'image_url' => 'nullable|string',
            'units' => 'nullable|array',
            'units.*.id' => 'nullable|string',
            'units.*.unit_name' => 'required|string',
            'units.*.conversion_factor' => 'required|numeric|min:0.0001',
            'units.*.barcode' => 'nullable|string',
            'units.*.sell_price' => 'nullable|numeric|min:0',
        ]);

        if (isset($validated['selling_price'])) {
            $validated['sell_price'] = $validated['selling_price'];
        }
        if (isset($validated['purchase_price'])) {
            $validated['cost_price'] = $validated['purchase_price'];
        }
        if (isset($validated['tax_rate'])) {
            $validated['vat_rate'] = $validated['tax_rate'];
        }

        if (! array_key_exists('wholesale_price', $validated) && isset($validated['sell_price'])) {
            $validated['wholesale_price'] = round($validated['sell_price'] * 0.80, 2);
        }
        if (! array_key_exists('semi_wholesale_price', $validated) && isset($validated['sell_price'])) {
            $validated['semi_wholesale_price'] = round($validated['sell_price'] * 0.90, 2);
        }

        $product->update($validated);

        if (isset($validated['units'])) {
            $product->units()->delete(); // Simple replace
            foreach ($validated['units'] as $unit) {
                $product->units()->create($unit);
            }
        }

        $product->load(['units', 'warehouseStocks']);

        return $this->success($product, 'Product updated successfully');
    }

    public function updateBinLocation(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'warehouse_id' => 'nullable|uuid',
            'bin_location' => 'nullable|string|max:255',
        ]);

        if (!empty($validated['warehouse_id'])) {
            $warehouseProduct = \App\Infrastructure\Eloquent\Models\WarehouseProductModel::query()
                ->where(['product_id' => $id])
                ->where(['warehouse_id' => $validated['warehouse_id']])
                ->first();

            if ($warehouseProduct) {
                $warehouseProduct->update(['bin_location' => $validated['bin_location']]);
            } else {
                \App\Infrastructure\Eloquent\Models\WarehouseProductModel::query()->create([
                    'id' => Str::uuid()->toString(),
                    'product_id' => $id,
                    'warehouse_id' => $validated['warehouse_id'],
                    'bin_location' => $validated['bin_location'],
                    'quantity' => 0,
                    'average_cost' => 0,
                ]);
            }
        } else {
            // Update all warehouse records for this product
            \App\Infrastructure\Eloquent\Models\WarehouseProductModel::query()
                ->where(['product_id' => $id])
                ->update(['bin_location' => $validated['bin_location']]);
        }

        return $this->success(null, 'Bin location updated successfully');
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $product = ProductModel::query()->where(['tenant_id' => $this->getTenantId($request)])->find($id);

        if (! $product) {
            return $this->error('Product not found', 404);
        }

        // Add proper checks here if product is linked to invoices
        $product->delete();

        return $this->success(null, 'Product deleted successfully');
    }

    public function uploadImage(Request $request): JsonResponse
    {
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,gif,svg,webp|max:2048',
        ]);

        if ($request->hasFile('image')) {
            $file = $request->file('image');
            $filename = time().'_'.uniqid().'.'.$file->getClientOriginalExtension();
            $tenantId = $this->getTenantId($request);

            // Store in public/uploads/tenant_{id}/products/
            $destinationPath = public_path('uploads/tenant_'.$tenantId.'/products');
            if (! file_exists($destinationPath)) {
                mkdir($destinationPath, 0755, true);
            }

            $file->move($destinationPath, $filename);

            // Build absolute URL
            $url = $request->getSchemeAndHttpHost().'/uploads/tenant_'.$tenantId.'/products/'.$filename;

            return $this->success(['image_url' => $url], 'Image uploaded successfully');
        }

        return $this->error('Failed to upload image', 400);
    }

    public function getAlternatives(Request $request, string $id): JsonResponse
    {
        $product = ProductModel::query()->where(['tenant_id' => $this->getTenantId($request)])->find($id);

        if (! $product) {
            return $this->error('Product not found', 404);
        }

        $alternatives = $product->alternatives()
            ->with(['warehouseStocks' => function ($q) {
                $q->select('product_id', 'quantity', 'warehouse_id');
            }])->get();

        return $this->success($alternatives);
    }

    public function attachAlternative(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'alternative_product_id' => 'required|uuid',
            'notes' => 'nullable|string',
        ]);

        if ($id === $validated['alternative_product_id']) {
            return $this->error('A product cannot be an alternative to itself', 422);
        }

        $product = ProductModel::query()->where(['tenant_id' => $this->getTenantId($request)])->find($id);
        $alternative = ProductModel::query()->where(['tenant_id' => $this->getTenantId($request)])->find($validated['alternative_product_id']);

        if (! $product || ! $alternative) {
            return $this->error('Product or alternative product not found', 404);
        }

        DB::connection('tenant')->transaction(function () use ($product, $alternative, $validated, $request) {
            $product->alternatives()->syncWithoutDetaching([
                $alternative->id => [
                    'id' => Str::uuid()->toString(),
                    'tenant_id' => $this->getTenantId($request),
                    'notes' => $validated['notes'] ?? null,
                ],
            ]);

            $alternative->alternatives()->syncWithoutDetaching([
                $product->id => [
                    'id' => Str::uuid()->toString(),
                    'tenant_id' => $this->getTenantId($request),
                    'notes' => $validated['notes'] ?? null,
                ],
            ]);
        });

        return $this->success(null, 'Alternative product linked successfully');
    }

    public function detachAlternative(Request $request, string $id, string $alternativeId): JsonResponse
    {
        $product = ProductModel::query()->where(['tenant_id' => $this->getTenantId($request)])->find($id);

        if (! $product) {
            return $this->error('Product not found', 404);
        }

        DB::connection('tenant')->transaction(function () use ($product, $alternativeId) {
            $product->alternatives()->detach($alternativeId);

            $alternative = ProductModel::query()->find($alternativeId);
            if ($alternative) {
                $alternative->alternatives()->detach($product->id);
            }
        });

        return $this->success(null, 'Alternative product unlinked successfully');
    }
}
