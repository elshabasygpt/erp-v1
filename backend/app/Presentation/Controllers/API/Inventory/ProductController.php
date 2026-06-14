<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Inventory;

use App\Presentation\Controllers\API\BaseController;
use App\Domain\Inventory\Repositories\ProductRepositoryInterface;
use App\Infrastructure\Eloquent\Models\ProductModel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProductController extends BaseController
{
    public function __construct(private ProductRepositoryInterface $productRepository) {}

    public function index(Request $request): JsonResponse
    {
        $filters = $request->only(['search', 'is_active']);
        return $this->paginated($this->productRepository->paginate((int)$request->get('per_page', 15), $filters));
    }

    public function show(string $id): JsonResponse
    {
        $product = ProductModel::with(['warehouseStocks', 'units'])->find($id);
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
        if (!$warehouseId) return $this->error('warehouse_id is required.', 422);
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
            'purchase_price' => 'nullable|numeric|min:0',
            'tax_rate' => 'nullable|numeric|min:0',
            'is_active' => 'boolean',
            'category_id' => 'nullable|string',
            'unit_of_measure' => 'nullable|string',
            'stock_alert_level' => 'nullable|integer|min:0',
            'image_url' => 'nullable|string',
            'units' => 'nullable|array',
            'units.*.unit_name' => 'required|string',
            'units.*.conversion_factor' => 'required|numeric|min:0.0001',
            'units.*.barcode' => 'nullable|string',
            'units.*.sell_price' => 'nullable|numeric|min:0',
        ]);

        $validated['id'] = Str::uuid()->toString();
        $validated['is_active'] = $validated['is_active'] ?? true;
        if (!isset($validated['name_ar'])) $validated['name_ar'] = $validated['name'];
        if (isset($validated['selling_price'])) $validated['sell_price'] = $validated['selling_price'];
        if (isset($validated['purchase_price'])) $validated['cost_price'] = $validated['purchase_price'];
        if (isset($validated['tax_rate'])) $validated['vat_rate'] = $validated['tax_rate'];
        
        $product = ProductModel::create($validated);
        
        if (!empty($validated['units'])) {
            foreach ($validated['units'] as $unit) {
                $product->units()->create($unit);
            }
        }
        
        $product->load(['units', 'warehouseStocks']);
        return $this->success($product, 'Product created successfully', 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $product = ProductModel::find($id);

        if (!$product) {
            return $this->error('Product not found', 404);
        }

        $validated = $request->validate([
            'sku' => 'sometimes|required|string|unique:products,sku,' . $id,
            'barcode' => 'nullable|string|unique:products,barcode,' . $id,
            'name' => 'sometimes|required|string',
            'name_ar' => 'nullable|string',
            'description' => 'nullable|string',
            'selling_price' => 'sometimes|required|numeric|min:0',
            'purchase_price' => 'nullable|numeric|min:0',
            'tax_rate' => 'nullable|numeric|min:0',
            'is_active' => 'boolean',
            'category_id' => 'nullable|string',
            'unit_of_measure' => 'nullable|string',
            'stock_alert_level' => 'nullable|integer|min:0',
            'image_url' => 'nullable|string',
            'units' => 'nullable|array',
            'units.*.id' => 'nullable|string',
            'units.*.unit_name' => 'required|string',
            'units.*.conversion_factor' => 'required|numeric|min:0.0001',
            'units.*.barcode' => 'nullable|string',
            'units.*.sell_price' => 'nullable|numeric|min:0',
        ]);

        if (isset($validated['selling_price'])) $validated['sell_price'] = $validated['selling_price'];
        if (isset($validated['purchase_price'])) $validated['cost_price'] = $validated['purchase_price'];
        if (isset($validated['tax_rate'])) $validated['vat_rate'] = $validated['tax_rate'];

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

    public function destroy(string $id): JsonResponse
    {
        $product = ProductModel::find($id);

        if (!$product) {
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
            $filename = time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
            
            // Store in public/uploads/products/
            $destinationPath = public_path('uploads/products');
            if (!file_exists($destinationPath)) {
                mkdir($destinationPath, 0755, true);
            }
            
            $file->move($destinationPath, $filename);
            
            // Build absolute URL
            $url = $request->getSchemeAndHttpHost() . '/uploads/products/' . $filename;
            
            return $this->success(['image_url' => $url], 'Image uploaded successfully');
        }

        return $this->error('Failed to upload image', 400);
    }
}
