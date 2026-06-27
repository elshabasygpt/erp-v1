<?php

declare(strict_types=1);

namespace App\Application\Purchases\Services;

use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\SupplierModel;
use App\Infrastructure\Eloquent\Models\SupplierPriceHistoryModel;
use App\Infrastructure\Eloquent\Models\SupplierPriceListModel;
use Illuminate\Support\Facades\DB;

class SupplierPriceListService
{
    public function getPrices(string $tenantId, array $filters, int $limit = 20)
    {
        $query = SupplierPriceListModel::where('tenant_id', $tenantId)
            ->with(['supplier:id,name,phone', 'product:id,name,name_ar,sku,brand,quality_grade,oem_number,cost_price'])
            ->orderBy('updated_at', 'desc');

        if (!empty($filters['supplier_id'])) $query->where('supplier_id', $filters['supplier_id']);
        if (!empty($filters['product_id']))  $query->where('product_id',  $filters['product_id']);
        if (!empty($filters['active_only'])) $query->where('is_active', true);

        if (!empty($filters['search'])) {
            $s = $filters['search'];
            $query->whereHas('product', fn($q) =>
                $q->where('name', 'like', "%{$s}%")
                  ->orWhere('sku', 'like', "%{$s}%")
                  ->orWhere('oem_number', 'like', "%{$s}%")
                  ->orWhere('brand', 'like', "%{$s}%")
            );
        }

        return $query->paginate($limit);
    }

    public function comparePrices(string $tenantId, string $productId): array
    {
        $prices = SupplierPriceListModel::where('tenant_id', $tenantId)
            ->where('product_id', $productId)
            ->where('is_active', true)
            ->with(['supplier:id,name,phone'])
            ->orderBy('unit_price', 'asc')
            ->get();

        if ($prices->isEmpty()) {
            return [
                'product_id' => $productId,
                'prices'     => [],
                'best_price' => null,
            ];
        }

        $cheapest = $prices->first();
        $product  = ProductModel::where('tenant_id', $tenantId)
            ->select(['id','name','name_ar','sku','brand','cost_price','oem_number'])
            ->find($productId);

        return [
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
                    ? round((float)$product->cost_price - (float)$p->unit_price, 6)
                    : null,
            ])->values(),
            'best_price' => [
                'supplier_name' => $cheapest->supplier->name,
                'unit_price'    => (float) $cheapest->unit_price,
            ],
        ];
    }

    public function storePrice(string $tenantId, array $data, string $userId): SupplierPriceListModel
    {
        $supplier = SupplierModel::where('tenant_id', $tenantId)->find($data['supplier_id']);
        $product  = ProductModel::where('tenant_id', $tenantId)->find($data['product_id']);

        if (!$supplier) throw new \InvalidArgumentException('Supplier not found');
        if (!$product)  throw new \InvalidArgumentException('Product not found');

        $existing = SupplierPriceListModel::where('tenant_id', $tenantId)
            ->where('supplier_id', $data['supplier_id'])
            ->where('product_id',  $data['product_id'])
            ->withTrashed()
            ->first();

        if ($existing && $existing->trashed()) {
            $existing->restore();
        }

        if ($existing && !$existing->trashed()) {
            if ((float)$existing->unit_price !== (float)$data['unit_price']) {
                $this->recordHistory($tenantId, $existing->id, $existing->unit_price, $data['unit_price'], 'تحديث يدوي', $userId);
            }
            $existing->fill($data);
            $existing->updated_by = $userId;
            $existing->save();

            return $existing->load(['supplier', 'product']);
        }

        $price = new SupplierPriceListModel($data);
        $price->tenant_id  = $tenantId;
        $price->created_by = $userId;
        $price->save();

        return $price->load(['supplier', 'product']);
    }

    public function updatePrice(string $tenantId, string $id, array $data, string $userId): SupplierPriceListModel
    {
        $existing = SupplierPriceListModel::where('tenant_id', $tenantId)->find($id);

        if (!$existing) {
            throw new \InvalidArgumentException('Price list not found');
        }

        if (isset($data['unit_price']) && (float)$existing->unit_price !== (float)$data['unit_price']) {
            $this->recordHistory($tenantId, $existing->id, $existing->unit_price, $data['unit_price'], 'تحديث يدوي', $userId);
        }

        $existing->fill($data);
        $existing->updated_by = $userId;
        $existing->save();

        return $existing->load(['supplier', 'product']);
    }

    public function deletePrice(string $tenantId, string $id): void
    {
        $price = SupplierPriceListModel::where('tenant_id', $tenantId)->find($id);
        if (!$price) throw new \InvalidArgumentException('Price list not found');

        $price->delete();
    }

    public function getHistory(string $tenantId, string $id): array
    {
        $price = SupplierPriceListModel::where('tenant_id', $tenantId)->find($id);
        if (!$price) throw new \InvalidArgumentException('Price list not found');

        $history = SupplierPriceHistoryModel::where('price_list_id', $id)
            ->orderByDesc('created_at')
            ->limit(20)
            ->get();

        return [
            'current_price' => (float) $price->unit_price,
            'history'       => $history,
        ];
    }

    public function bulkImport(string $tenantId, array $data, string $userId): array
    {
        $supplier = SupplierModel::where('tenant_id', $tenantId)->find($data['supplier_id']);
        if (!$supplier) throw new \InvalidArgumentException('Supplier not found');

        $updated = 0; $created = 0;

        DB::connection('tenant')->transaction(function () use ($data, $tenantId, $userId, &$updated, &$created) {
            foreach ($data['items'] as $item) {
                $existing = SupplierPriceListModel::where('tenant_id', $tenantId)
                    ->where('supplier_id', $data['supplier_id'])
                    ->where('product_id', $item['product_id'])
                    ->first();

                if ($existing) {
                    if ((float)$existing->unit_price !== (float)$item['unit_price']) {
                        $this->recordHistory($tenantId, $existing->id, $existing->unit_price, $item['unit_price'], 'استيراد جملة', $userId);
                    }
                    $existing->update([
                        'unit_price' => $item['unit_price'], 
                        'supplier_sku' => $item['supplier_sku'] ?? $existing->supplier_sku,
                        'updated_by' => $userId
                    ]);
                    $updated++;
                } else {
                    $price = new SupplierPriceListModel($item);
                    $price->supplier_id = $data['supplier_id'];
                    $price->tenant_id   = $tenantId;
                    $price->created_by  = $userId;
                    $price->save();
                    $created++;
                }
            }
        });

        return ['created' => $created, 'updated' => $updated];
    }

    private function recordHistory(string $tenantId, string $priceListId, $oldPrice, $newPrice, string $reason, string $userId): void
    {
        $oldPriceFloat = (float) $oldPrice;
        $newPriceFloat = (float) $newPrice;
        
        $changePercent = $oldPriceFloat > 0
            ? round(($newPriceFloat - $oldPriceFloat) / $oldPriceFloat * 100, 6)
            : 0;

        SupplierPriceHistoryModel::create([
            'tenant_id'      => $tenantId,
            'price_list_id'  => $priceListId,
            'old_price'      => $oldPriceFloat,
            'new_price'      => $newPriceFloat,
            'change_percent' => $changePercent,
            'change_reason'  => $reason,
            'created_by'     => $userId,
        ]);
    }
}
