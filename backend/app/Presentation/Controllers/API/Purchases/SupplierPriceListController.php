<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Purchases;

use App\Application\Purchases\Services\SupplierPriceListService;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupplierPriceListController extends BaseTenantController
{
    public function __construct(private SupplierPriceListService $service)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $filters = $request->only(['supplier_id', 'product_id', 'active_only', 'search']);
        $limit = (int) $request->query('limit', 20);

        $items = $this->service->getPrices($tenantId, $filters, $limit);

        return $this->paginated($items->toArray(), 'Price lists retrieved');
    }

    public function compareByProduct(Request $request, string $productId): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $result = $this->service->comparePrices($tenantId, $productId);

        return $this->success($result);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'supplier_id'       => 'required|uuid|exists:suppliers,id',
            'product_id'        => 'required|uuid|exists:products,id',
            'unit_price'        => 'required|numeric|min:0.0001',
            'currency_code'     => 'nullable|string|size:3',
            'min_quantity'      => 'nullable|numeric|min:0.01',
            'supplier_sku'      => 'nullable|string|max:100',
            'notes'             => 'nullable|string',
            'valid_from'        => 'nullable|date',
            'valid_until'       => 'nullable|date|after_or_equal:valid_from',
            'lead_time_days'    => 'nullable|integer|min:0|max:365',
        ]);

        $tenantId = $this->getTenantId($request);
        $userId = $request->user()->id;

        try {
            $price = $this->service->storePrice($tenantId, $validated, $userId);
            return $this->success($price, 'Price created successfully', 201);
        } catch (\InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 404);
        }
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'unit_price'        => 'sometimes|required|numeric|min:0.0001',
            'currency_code'     => 'nullable|string|size:3',
            'min_quantity'      => 'nullable|numeric|min:0.01',
            'supplier_sku'      => 'nullable|string|max:100',
            'notes'             => 'nullable|string',
            'is_active'         => 'sometimes|boolean',
            'valid_from'        => 'nullable|date',
            'valid_until'       => 'nullable|date|after_or_equal:valid_from',
            'lead_time_days'    => 'nullable|integer|min:0|max:365',
        ]);

        $tenantId = $this->getTenantId($request);
        $userId = $request->user()->id;

        try {
            $price = $this->service->updatePrice($tenantId, $id, $validated, $userId);
            return $this->success($price, 'Price updated successfully');
        } catch (\InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 404);
        }
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $tenantId = $this->getTenantId($request);

        try {
            $this->service->deletePrice($tenantId, $id);
            return $this->success(null, 'Price list deleted successfully');
        } catch (\InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 404);
        }
    }

    public function getHistory(Request $request, string $id): JsonResponse
    {
        $tenantId = $this->getTenantId($request);

        try {
            $result = $this->service->getHistory($tenantId, $id);
            return $this->success($result);
        } catch (\InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 404);
        }
    }

    public function bulkImport(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'supplier_id' => 'required|uuid|exists:suppliers,id',
            'items'       => 'required|array|min:1|max:500',
            'items.*.product_id'  => 'required|uuid|exists:products,id',
            'items.*.unit_price'  => 'required|numeric|min:0.0001',
            'items.*.supplier_sku'=> 'nullable|string|max:100',
            'items.*.min_quantity'=> 'nullable|numeric|min:0.01',
        ]);

        $tenantId = $this->getTenantId($request);
        $userId = $request->user()->id;

        try {
            $result = $this->service->bulkImport($tenantId, $validated, $userId);
            return $this->success($result, "تم استيراد {$result['created']} سعر جديد وتحديث {$result['updated']}");
        } catch (\InvalidArgumentException $e) {
            return $this->error($e->getMessage(), 404);
        }
    }
}
