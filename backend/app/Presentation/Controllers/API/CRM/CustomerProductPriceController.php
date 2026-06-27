<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\CRM;

use App\Infrastructure\Eloquent\Models\CustomerProductPriceModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerProductPriceController extends BaseTenantController
{
    /** List all custom prices for a customer. */
    public function index(Request $request, string $customerId): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $prices = CustomerProductPriceModel::query()
            ->where('tenant_id', $tenantId)
            ->where('customer_id', $customerId)
            ->with('product:id,name,sku,sell_price')
            ->orderBy('created_at', 'desc')
            ->get();

        return $this->success($prices);
    }

    /** Set (upsert) a custom price for a specific product/customer combination. */
    public function upsert(Request $request, string $customerId): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $validated = $request->validate([
            'product_id'  => 'required|uuid|exists:products,id',
            'price'       => 'required|numeric|min:0',
            'valid_from'  => 'nullable|date',
            'valid_until' => 'nullable|date|after_or_equal:valid_from',
            'notes'       => 'nullable|string|max:500',
        ]);

        $price = CustomerProductPriceModel::updateOrCreate(
            [
                'tenant_id'   => $tenantId,
                'customer_id' => $customerId,
                'product_id'  => $validated['product_id'],
            ],
            [
                'price'       => $validated['price'],
                'valid_from'  => $validated['valid_from'] ?? null,
                'valid_until' => $validated['valid_until'] ?? null,
                'notes'       => $validated['notes'] ?? null,
                'created_by'  => $request->user()?->id,
            ]
        );

        return $this->success($price->load('product:id,name,sku,sell_price'), 'Custom price saved');
    }

    /** Remove a custom price entry. */
    public function destroy(Request $request, string $customerId, string $id): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $price = CustomerProductPriceModel::query()
            ->where('tenant_id', $tenantId)
            ->where('customer_id', $customerId)
            ->findOrFail($id);

        $price->delete();

        return $this->success(null, 'Custom price removed');
    }

    /** Look up the active custom price for a single product+customer (used by POS). */
    public function lookup(Request $request): JsonResponse
    {
        $tenantId  = $this->getTenantId($request);
        $validated = $request->validate([
            'customer_id' => 'required|uuid',
            'product_id'  => 'required|uuid',
        ]);

        $today = now()->toDateString();
        $price = CustomerProductPriceModel::query()
            ->where('tenant_id', $tenantId)
            ->where('customer_id', $validated['customer_id'])
            ->where('product_id', $validated['product_id'])
            ->where(fn($q) => $q->whereNull('valid_from')->orWhere('valid_from', '<=', $today))
            ->where(fn($q) => $q->whereNull('valid_until')->orWhere('valid_until', '>=', $today))
            ->first();

        return $this->success([
            'has_custom_price' => (bool) $price,
            'price'            => $price ? (float) $price->price : null,
        ]);
    }
}
