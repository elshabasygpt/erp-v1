<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Inventory;

use App\Infrastructure\Eloquent\Models\ProductCrossReferenceModel;
use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CrossReferenceController extends BaseTenantController
{
    public function lookup(Request $request): JsonResponse
    {
        $raw = trim((string) $request->query('number', ''));
        if (mb_strlen($raw) < 2) {
            return $this->error('أدخل رقم قطعة (حرفين على الأقل)', 422);
        }

        $tenantId   = $this->getTenantId($request);
        $normalized = ProductCrossReferenceModel::normalize($raw);

        $directIds = DB::connection('tenant')
            ->table('products')
            ->where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->where(function ($q) use ($normalized) {
                $q->whereRaw("regexp_replace(upper(coalesce(oem_number,'')),  '[^A-Z0-9]', '', 'g') = ?", [$normalized])
                  ->orWhereRaw("regexp_replace(upper(coalesce(part_number,'')), '[^A-Z0-9]', '', 'g') = ?", [$normalized])
                  ->orWhereRaw("regexp_replace(upper(coalesce(sku,'')),         '[^A-Z0-9]', '', 'g') = ?", [$normalized]);
            })
            ->pluck('id')->toArray();

        $xrefRows = DB::connection('tenant')
            ->table('product_cross_references')
            ->where('tenant_id', $tenantId)
            ->whereNull('deleted_at')
            ->where(function ($q) use ($normalized) {
                $q->where('normalized_number', $normalized)
                  ->orWhere('normalized_number', 'like', $normalized . '%');
            })
            ->get(['product_id', 'reference_number', 'reference_brand', 'reference_type']);

        $xrefIds = $xrefRows->pluck('product_id')->unique()->toArray();

        $allIds = array_values(array_unique(array_merge($directIds, $xrefIds)));

        if (empty($allIds)) {
            return $this->success([
                'query'        => $raw,
                'normalized'   => $normalized,
                'matches'      => [],
                'alternatives' => [],
            ]);
        }

        $products = ProductModel::query()
            ->where('tenant_id', $tenantId)
            ->whereIn('id', $allIds)
            ->with(['warehouseStocks:product_id,quantity,warehouse_id'])
            ->get();

        $buildCard = function ($p) use ($directIds, $xrefRows) {
            $stock = (float) ($p->warehouseStocks?->sum('quantity') ?? 0);
            $matchType = in_array($p->id, $directIds, true) ? 'direct' : 'cross_reference';
            $matchedVia = $xrefRows->where('product_id', $p->id)->first();
            return [
                'product_id'    => $p->id,
                'name'          => $p->name,
                'name_ar'       => $p->name_ar,
                'sku'           => $p->sku,
                'oem_number'    => $p->oem_number,
                'part_number'   => $p->part_number,
                'brand'         => $p->brand,
                'quality_grade' => $p->quality_grade,
                'sell_price'    => (float) $p->sell_price,
                'stock'         => $stock,
                'in_stock'      => $stock > 0,
                'match_type'    => $matchType,
                'matched_brand' => $matchedVia->reference_brand ?? null,
                'matched_type'  => $matchedVia->reference_type ?? null,
            ];
        };

        $matches = $products->map($buildCard)
            ->sortBy(fn ($m) => [$m['in_stock'] ? 0 : 1, $m['match_type'] === 'direct' ? 0 : 1])
            ->values();

        $alternativeIds = DB::connection('tenant')
            ->table('product_alternatives')
            ->where('tenant_id', $tenantId)
            ->whereIn('product_id', $allIds)
            ->pluck('alternative_product_id')
            ->reject(fn ($id) => in_array($id, $allIds, true))
            ->unique()->toArray();

        $alternatives = collect();
        if (! empty($alternativeIds)) {
            $alternatives = ProductModel::query()
                ->where('tenant_id', $tenantId)
                ->whereIn('id', $alternativeIds)
                ->with(['warehouseStocks:product_id,quantity,warehouse_id'])
                ->get()
                ->map(function ($p) {
                    $stock = (float) ($p->warehouseStocks?->sum('quantity') ?? 0);
                    return [
                        'product_id'    => $p->id,
                        'name'          => $p->name,
                        'name_ar'       => $p->name_ar,
                        'sku'           => $p->sku,
                        'oem_number'    => $p->oem_number,
                        'brand'         => $p->brand,
                        'quality_grade' => $p->quality_grade,
                        'sell_price'    => (float) $p->sell_price,
                        'stock'         => $stock,
                        'in_stock'      => $stock > 0,
                    ];
                })->values();
        }

        return $this->success([
            'query'        => $raw,
            'normalized'   => $normalized,
            'matches'      => $matches,
            'alternatives' => $alternatives,
        ]);
    }

    public function index(Request $request, string $productId): JsonResponse
    {
        $product = ProductModel::where('tenant_id', $this->getTenantId($request))->find($productId);
        if (! $product) {
            return $this->error('Product not found', 404);
        }

        $refs = ProductCrossReferenceModel::where('tenant_id', $this->getTenantId($request))
            ->where('product_id', $productId)
            ->orderBy('reference_type')
            ->get();

        return $this->success($refs);
    }

    public function store(Request $request, string $productId): JsonResponse
    {
        $validated = $request->validate([
            'reference_number' => 'required|string|max:120',
            'reference_brand'  => 'nullable|string|max:100',
            'reference_type'   => 'required|in:oem,aftermarket,equivalent,superseded',
            'notes'            => 'nullable|string|max:255',
        ]);

        $tenantId = $this->getTenantId($request);
        $product  = ProductModel::where('tenant_id', $tenantId)->find($productId);
        if (! $product) {
            return $this->error('Product not found', 404);
        }

        $normalized = ProductCrossReferenceModel::normalize($validated['reference_number']);
        if ($normalized === '') {
            return $this->error('رقم غير صالح', 422);
        }

        $exists = ProductCrossReferenceModel::where('tenant_id', $tenantId)
            ->where('product_id', $productId)
            ->where('normalized_number', $normalized)
            ->where('reference_brand', $validated['reference_brand'] ?? null)
            ->exists();
        if ($exists) {
            return $this->error('هذا الرقم مضاف بالفعل لهذه القطعة', 422);
        }

        $ref = new ProductCrossReferenceModel([
            'product_id'        => $productId,
            'reference_number'  => $validated['reference_number'],
            'normalized_number' => $normalized,
            'reference_brand'   => $validated['reference_brand'] ?? null,
            'reference_type'    => $validated['reference_type'],
            'notes'             => $validated['notes'] ?? null,
            'created_by'        => $request->user()?->id,
        ]);
        $ref->tenant_id = $tenantId;
        $ref->save();

        return $this->success($ref, 'تمت الإضافة', 201);
    }

    public function destroy(Request $request, string $productId, string $refId): JsonResponse
    {
        $ref = ProductCrossReferenceModel::where('tenant_id', $this->getTenantId($request))
            ->where('product_id', $productId)->find($refId);
        if (! $ref) {
            return $this->error('Reference not found', 404);
        }
        $ref->delete();
        return $this->success(null, 'تم الحذف');
    }

    public function bulkStore(Request $request, string $productId): JsonResponse
    {
        $validated = $request->validate([
            'items'                   => 'required|array|min:1|max:200',
            'items.*.reference_number' => 'required|string|max:120',
            'items.*.reference_brand'  => 'nullable|string|max:100',
            'items.*.reference_type'   => 'nullable|in:oem,aftermarket,equivalent,superseded',
        ]);

        $tenantId = $this->getTenantId($request);
        $product  = ProductModel::where('tenant_id', $tenantId)->find($productId);
        if (! $product) {
            return $this->error('Product not found', 404);
        }

        $added = 0;
        $skipped = 0;
        DB::connection('tenant')->transaction(function () use ($validated, $tenantId, $productId, $request, &$added, &$skipped) {
            foreach ($validated['items'] as $item) {
                $normalized = ProductCrossReferenceModel::normalize($item['reference_number']);
                if ($normalized === '') {
                    $skipped++;
                    continue;
                }

                $exists = ProductCrossReferenceModel::where('tenant_id', $tenantId)
                    ->where('product_id', $productId)
                    ->where('normalized_number', $normalized)
                    ->where('reference_brand', $item['reference_brand'] ?? null)
                    ->exists();
                if ($exists) {
                    $skipped++;
                    continue;
                }

                $ref = new ProductCrossReferenceModel([
                    'product_id'        => $productId,
                    'reference_number'  => $item['reference_number'],
                    'normalized_number' => $normalized,
                    'reference_brand'   => $item['reference_brand'] ?? null,
                    'reference_type'    => $item['reference_type'] ?? 'aftermarket',
                    'created_by'        => $request->user()?->id,
                ]);
                $ref->tenant_id = $tenantId;
                $ref->save();
                $added++;
            }
        });

        return $this->success(
            ['added' => $added, 'skipped' => $skipped],
            "تمت إضافة {$added}، تجاهل {$skipped} مكرر/غير صالح"
        );
    }
}
