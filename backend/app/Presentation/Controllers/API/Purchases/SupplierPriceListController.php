<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Purchases;

use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\SupplierModel;
use App\Infrastructure\Eloquent\Models\SupplierPriceHistoryModel;
use App\Infrastructure\Eloquent\Models\SupplierPriceListModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SupplierPriceListController extends BaseTenantController
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = $this->getTenantId($request);

        $query = SupplierPriceListModel::where('tenant_id', $tenantId)
            ->with(['supplier:id,name,phone', 'product:id,name,name_ar,sku,brand,quality_grade,oem_number,cost_price'])
            ->orderBy('updated_at', 'desc');

        if ($request->filled('supplier_id')) $query->where('supplier_id', $request->supplier_id);
        if ($request->filled('product_id'))  $query->where('product_id',  $request->product_id);
        if ($request->boolean('active_only', false)) $query->where('is_active', true);

        if ($request->filled('search')) {
            $s = $request->search;
            $query->whereHas('product', fn($q) =>
                $q->where('name', 'ilike', "%{$s}%")
                  ->orWhere('sku', 'ilike', "%{$s}%")
                  ->orWhere('oem_number', 'ilike', "%{$s}%")
                  ->orWhere('brand', 'ilike', "%{$s}%")
            );
        }

        $items = $query->paginate((int) $request->query('limit', 20));
        return $this->paginated($items->toArray(), 'Price lists retrieved');
    }

    public function compareByProduct(Request $request, string $productId): JsonResponse
    {
        $tenantId = $this->getTenantId($request);

        $prices = SupplierPriceListModel::where('tenant_id', $tenantId)
            ->where('product_id', $productId)
            ->where('is_active', true)
            ->with(['supplier:id,name,phone'])
            ->orderBy('unit_price', 'asc')
            ->get();

        if ($prices->isEmpty()) {
            return $this->success([
                'product_id' => $productId,
                'prices'     => [],
                'best_price' => null,
            ]);
        }

        $cheapest = $prices->first();
        $product  = ProductModel::where('tenant_id', $tenantId)
            ->select(['id','name','name_ar','sku','brand','cost_price','oem_number'])
            ->find($productId);

        return $this->success([
            'product'    => $product,
            'prices'     => $prices->map(fn($p) => [
                'id'              => $p->id,
                'supplier_id'     => $p->supplier_id,
                'supplier_name'   => $p->supplier->name,
                'supplier_phone'  => $p->supplier->phone,
                'unit_price'      => (float) $p->unit_price,
                'currency_code'   => $p->currency_code,
                'min_quantity'    => (float) $p->min_quantity,
                'supplier_sku'    => $p->supplier_sku,
                'lead_time_days'  => $p->lead_time_days,
                'last_purchase_date' => $p->last_purchase_date?->format('Y-m-d'),
                'valid_until'     => $p->valid_until?->format('Y-m-d'),
                'is_cheapest'     => $p->id === $cheapest->id,
                'savings_vs_current_cost' => $product
                    ? round((float)$product->cost_price - (float)$p->unit_price, 2)
                    : null,
            ])->values(),
            'best_price' => [
                'supplier_name' => $cheapest->supplier->name,
                'unit_price'    => (float) $cheapest->unit_price,
            ],
        ]);
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

        // تحقق ملكية المورد والمنتج للـ tenant
        $supplier = SupplierModel::where('tenant_id', $tenantId)->find($validated['supplier_id']);
        $product  = ProductModel::where('tenant_id', $tenantId)->find($validated['product_id']);

        if (!$supplier) return $this->error('Supplier not found', 404);
        if (!$product)  return $this->error('Product not found', 404);

        // لو موجود — حدّث، لو مش موجود — أنشئ
        $existing = SupplierPriceListModel::where('tenant_id', $tenantId)
            ->where('supplier_id', $validated['supplier_id'])
            ->where('product_id',  $validated['product_id'])
            ->withTrashed()
            ->first();

        if ($existing && $existing->trashed()) {
            $existing->restore();
        }

        if ($existing && !$existing->trashed()) {
            // سجّل التاريخ إذا تغير السعر
            if ((float)$existing->unit_price !== (float)$validated['unit_price']) {
                $changePercent = (float)$existing->unit_price > 0
                    ? round(((float)$validated['unit_price'] - (float)$existing->unit_price) / (float)$existing->unit_price * 100, 2)
                    : 0;

                SupplierPriceHistoryModel::create([
                    'tenant_id'      => $tenantId,
                    'price_list_id'  => $existing->id,
                    'old_price'      => $existing->unit_price,
                    'new_price'      => $validated['unit_price'],
                    'change_percent' => $changePercent,
                    'change_reason'  => 'تحديث يدوي',
                    'created_by'     => $request->user()->id,
                ]);
            }
            $existing->fill($validated);
            $existing->updated_by = $request->user()->id;
            $existing->save();

            return $this->success($existing->load(['supplier', 'product']), 'Price updated successfully');
        }

        $price = new SupplierPriceListModel($validated);
        $price->tenant_id  = $tenantId;
        $price->created_by = $request->user()->id;
        $price->save();

        return $this->success($price->load(['supplier', 'product']), 'Price created successfully', 201);
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
        $existing = SupplierPriceListModel::where('tenant_id', $tenantId)->find($id);

        if (!$existing) {
            return $this->error('Price list not found', 404);
        }

        if (isset($validated['unit_price']) && (float)$existing->unit_price !== (float)$validated['unit_price']) {
            $changePercent = (float)$existing->unit_price > 0
                ? round(((float)$validated['unit_price'] - (float)$existing->unit_price) / (float)$existing->unit_price * 100, 2)
                : 0;

            SupplierPriceHistoryModel::create([
                'tenant_id'      => $tenantId,
                'price_list_id'  => $existing->id,
                'old_price'      => $existing->unit_price,
                'new_price'      => $validated['unit_price'],
                'change_percent' => $changePercent,
                'change_reason'  => 'تحديث يدوي',
                'created_by'     => $request->user()->id,
            ]);
        }

        $existing->fill($validated);
        $existing->updated_by = $request->user()->id;
        $existing->save();

        return $this->success($existing->load(['supplier', 'product']), 'Price updated successfully');
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $price = SupplierPriceListModel::where('tenant_id', $this->getTenantId($request))->find($id);
        if (!$price) return $this->error('Price list not found', 404);

        $price->delete();
        return $this->success(null, 'Price list deleted successfully');
    }

    public function getHistory(Request $request, string $id): JsonResponse
    {
        $price = SupplierPriceListModel::where('tenant_id', $this->getTenantId($request))->find($id);
        if (!$price) return $this->error('Price list not found', 404);

        $history = SupplierPriceHistoryModel::where('price_list_id', $id)
            ->orderByDesc('created_at')
            ->limit(20)
            ->get();

        return $this->success([
            'current_price' => (float) $price->unit_price,
            'history'       => $history,
        ]);
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

        $tenantId  = $this->getTenantId($request);
        $supplier  = SupplierModel::where('tenant_id', $tenantId)->find($validated['supplier_id']);
        if (!$supplier) return $this->error('Supplier not found', 404);

        $updated = 0; $created = 0;

        DB::connection('tenant')->transaction(function () use ($validated, $tenantId, $request, &$updated, &$created) {
            foreach ($validated['items'] as $item) {
                $existing = SupplierPriceListModel::where('tenant_id', $tenantId)
                    ->where('supplier_id', $validated['supplier_id'])
                    ->where('product_id', $item['product_id'])
                    ->first();

                if ($existing) {
                    if ((float)$existing->unit_price !== (float)$item['unit_price']) {
                        $changePercent = (float)$existing->unit_price > 0
                            ? round(((float)$item['unit_price'] - (float)$existing->unit_price) / (float)$existing->unit_price * 100, 2) : 0;
                        SupplierPriceHistoryModel::create([
                            'tenant_id' => $tenantId, 'price_list_id' => $existing->id,
                            'old_price' => $existing->unit_price, 'new_price' => $item['unit_price'],
                            'change_percent' => $changePercent, 'change_reason' => 'استيراد جملة',
                            'created_by' => $request->user()->id,
                        ]);
                    }
                    $existing->update(['unit_price' => $item['unit_price'], 'supplier_sku' => $item['supplier_sku'] ?? $existing->supplier_sku]);
                    $updated++;
                } else {
                    $price = new SupplierPriceListModel($item);
                    $price->supplier_id = $validated['supplier_id'];
                    $price->tenant_id   = $tenantId;
                    $price->created_by  = $request->user()->id;
                    $price->save();
                    $created++;
                }
            }
        });

        return $this->success(['created' => $created, 'updated' => $updated], "تم استيراد {$created} سعر جديد وتحديث {$updated}");
    }
}
