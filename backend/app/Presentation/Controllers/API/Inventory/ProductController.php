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
        $product = ProductModel::query()->where(['tenant_id' => $this->getTenantId($request)])->with(['warehouseStocks', 'units', 'supersededBy', 'kitComponents.component', 'brandModel'])->find($id);

        return $product ? $this->success($product->toArray()) : $this->error('Product not found.', 404);
    }

    public function search(Request $request): JsonResponse
    {
        $query = trim($request->get('q', ''));
        $allowFuzzy = $request->get('allow_fuzzy', '1') !== '0';
        $tenantId = $this->getTenantId($request);

        // Exact substring search (name, name_ar, sku, barcode, oem, aliases)
        $results = $this->searchProducts($query, $tenantId);
        $fuzzy = false;

        // Fuzzy fallback: tokenize query, require ALL tokens ≥2 chars to match
        if (empty($results) && $allowFuzzy) {
            $tokens = array_filter(explode(' ', $query), fn($t) => mb_strlen(trim($t)) >= 2);
            if (!empty($tokens)) {
                $results = $this->searchProductsFuzzy($tokens, $tenantId);
                $fuzzy = !empty($results);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Success',
            'data' => $results,
            'meta' => ['fuzzy' => $fuzzy],
        ]);
    }

    private function searchProducts(string $query, string $tenantId): array
    {
        $aliasProductIds = DB::connection('tenant')
            ->table('product_aliases')
            ->where('tenant_id', $tenantId)
            ->where('alias_name', 'like', "%{$query}%")
            ->whereNull('deleted_at')
            ->pluck('product_id')
            ->toArray();

        return ProductModel::query()
            ->where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->where(function ($q) use ($query, $aliasProductIds) {
                $q->where('name', 'like', "%{$query}%")
                    ->orWhere('name_ar', 'like', "%{$query}%")
                    ->orWhere('sku', 'like', "%{$query}%")
                    ->orWhere('barcode', $query)
                    ->orWhere('oem_number', 'like', "%{$query}%")
                    ->orWhere('part_number', 'like', "%{$query}%");
                if (!empty($aliasProductIds)) {
                    $q->orWhereIn('id', $aliasProductIds);
                }
            })
            ->limit(20)
            ->get()
            ->toArray();
    }

    private function searchProductsFuzzy(array $tokens, string $tenantId): array
    {
        return ProductModel::query()
            ->where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->where(function ($q) use ($tokens) {
                foreach ($tokens as $token) {
                    $t = trim($token);
                    $q->where(function ($inner) use ($t) {
                        $inner->where('name', 'like', "%{$t}%")
                            ->orWhere('name_ar', 'like', "%{$t}%")
                            ->orWhere('sku', 'like', "%{$t}%");
                    });
                }
            })
            ->limit(20)
            ->get()
            ->toArray();
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
            'brand_id' => 'nullable|uuid|exists:tenant.brands,id',
            'brand' => 'nullable|string',
            'quality_grade' => 'nullable|string',
            'warranty_months' => 'nullable|integer',
            'country_of_origin' => 'nullable|string',
            'superseded_by_id' => 'nullable|uuid|exists:tenant.products,id',
            'image_url' => 'nullable|string',
            'units' => 'nullable|array',
            'units.*.unit_name' => 'required|string',
            'units.*.conversion_factor' => 'required|numeric|min:0.0001',
            'units.*.barcode' => 'nullable|string',
            'units.*.sell_price' => 'nullable|numeric|min:0',
            'kit_components' => 'nullable|array',
            'kit_components.*.component_id' => 'required|uuid|exists:tenant.products,id',
            'kit_components.*.quantity' => 'required|numeric|min:0.01',
            'profit_percent' => 'nullable|numeric|min:0|max:999',
            'default_discount_percent' => 'nullable|numeric|min:0|max:100',
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
            $validated['wholesale_price'] = round($validated['sell_price'] * 0.80, 6);
        }
        if (! array_key_exists('semi_wholesale_price', $validated) && isset($validated['sell_price'])) {
            $validated['semi_wholesale_price'] = round($validated['sell_price'] * 0.90, 6);
        }

        $validated['tenant_id'] = $this->getTenantId($request);
        $product = ProductModel::query()->create($validated);

        if (! empty($validated['units'])) {
            foreach ($validated['units'] as $unit) {
                $product->units()->create($unit);
            }
        }

        if (! empty($validated['kit_components']) && $product->is_kit) {
            foreach ($validated['kit_components'] as $component) {
                $product->kitComponents()->create([
                    'id' => Str::uuid()->toString(),
                    'tenant_id' => $this->getTenantId($request),
                    'child_product_id' => $component['component_id'],
                    'quantity_required' => $component['quantity'],
                ]);
            }
        }

        $product->load(['units', 'warehouseStocks', 'kitComponents.component', 'brandModel']);

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
            'oem_number' => 'nullable|string|max:100',
            'part_number' => 'nullable|string|max:100',
            'brand_id' => 'nullable|uuid|exists:tenant.brands,id',
            'brand' => 'nullable|string',
            'quality_grade' => 'nullable|string',
            'warranty_months' => 'nullable|integer',
            'country_of_origin' => 'nullable|string',
            'superseded_by_id' => 'nullable|uuid|exists:tenant.products,id',
            'image_url' => 'nullable|string',
            'units' => 'nullable|array',
            'units.*.id' => 'nullable|string',
            'units.*.unit_name' => 'required|string',
            'units.*.conversion_factor' => 'required|numeric|min:0.0001',
            'units.*.barcode' => 'nullable|string',
            'units.*.sell_price' => 'nullable|numeric|min:0',
            'kit_components' => 'nullable|array',
            'kit_components.*.component_id' => 'required|uuid|exists:tenant.products,id',
            'kit_components.*.quantity' => 'required|numeric|min:0.01',
            'profit_percent' => 'nullable|numeric|min:0|max:999',
            'default_discount_percent' => 'nullable|numeric|min:0|max:100',
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
            $validated['wholesale_price'] = round($validated['sell_price'] * 0.80, 6);
        }
        if (! array_key_exists('semi_wholesale_price', $validated) && isset($validated['sell_price'])) {
            $validated['semi_wholesale_price'] = round($validated['sell_price'] * 0.90, 6);
        }

        $product->update($validated);

        if (isset($validated['units'])) {
            $product->units()->delete(); // Simple replace
            foreach ($validated['units'] as $unit) {
                $product->units()->create($unit);
            }
        }

        if (isset($validated['kit_components']) && $product->is_kit) {
            $product->kitComponents()->delete();
            foreach ($validated['kit_components'] as $component) {
                $product->kitComponents()->create([
                    'id' => Str::uuid()->toString(),
                    'tenant_id' => $this->getTenantId($request),
                    'child_product_id' => $component['component_id'],
                    'quantity_required' => $component['quantity'],
                ]);
            }
        }

        $product->load(['units', 'warehouseStocks', 'kitComponents.component', 'brandModel']);

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

            $destDir  = public_path('uploads/products');
            if (!is_dir($destDir)) {
                mkdir($destDir, 0755, true);
            }
            $file->move($destDir, $filename);

            $url = '/uploads/products/'.$filename;

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

    public function getAssemblies(Request $request, string $id): JsonResponse
    {
        $product = ProductModel::query()->where(['tenant_id' => $this->getTenantId($request)])->find($id);

        if (! $product) {
            return $this->error('Product not found', 404);
        }

        $assemblies = $product->kitComponents()->with('component')->get();

        return $this->success($assemblies);
    }

    public function saveAssemblies(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'components' => 'required|array',
            'components.*.child_product_id' => 'required|uuid|exists:tenant.products,id',
            'components.*.quantity_required' => 'required|numeric|min:0.01',
        ]);

        $product = ProductModel::query()->where(['tenant_id' => $this->getTenantId($request)])->find($id);

        if (! $product) {
            return $this->error('Product not found', 404);
        }

        DB::connection('tenant')->transaction(function () use ($product, $validated, $request) {
            $product->kitComponents()->delete();
            foreach ($validated['components'] as $component) {
                $product->kitComponents()->create([
                    'id' => Str::uuid()->toString(),
                    'tenant_id' => $this->getTenantId($request),
                    'child_product_id' => $component['child_product_id'],
                    'quantity_required' => $component['quantity_required'],
                ]);
            }
        });

        return $this->success(null, 'Assemblies saved successfully');
    }

    public function checkUnique(Request $request): JsonResponse
    {
        $field = $request->query('field');
        $value = $request->query('value');
        $excludeId = $request->query('exclude_id');

        if (!in_array($field, ['barcode', 'sku'])) {
            return $this->error('Invalid field', 422);
        }

        $query = ProductModel::query()
            ->where($field, $value)
            ->where('tenant_id', $this->getTenantId($request));

        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        $exists = $query->exists();

        return $this->success([
            'unique' => !$exists,
            'exists' => $exists,
        ]);
    }

    public function resolvePrice(Request $request, string $id): JsonResponse
    {
        $product = ProductModel::query()
            ->where('tenant_id', $this->getTenantId($request))
            ->find($id);

        if (!$product) {
            return $this->error('Product not found', 404);
        }

        $unitPrice = (float) $product->sell_price;
        $tier = 'standard';

        $customerId = $request->query('customer_id');
        if ($customerId) {
            $customer = \App\Infrastructure\Eloquent\Models\CustomerModel::query()->find($customerId);
            if ($customer) {
                $segment = $customer->segment ?? '';
                if (strtolower($segment) === 'vip' && $product->wholesale_price) {
                    $unitPrice = (float) $product->wholesale_price;
                    $tier = $customer->segment;
                } elseif (strtolower($segment) === 'gold' && $product->semi_wholesale_price) {
                    $unitPrice = (float) $product->semi_wholesale_price;
                    $tier = $customer->segment;
                }
            }
        }

        return $this->success([
            'product_id' => $id,
            'unit_price' => $unitPrice,
            'tier' => $tier,
            'sell_price' => (float) $product->sell_price,
            'wholesale_price' => (float) ($product->wholesale_price ?? $product->sell_price),
            'semi_wholesale_price' => (float) ($product->semi_wholesale_price ?? $product->sell_price),
        ]);
    }
}
