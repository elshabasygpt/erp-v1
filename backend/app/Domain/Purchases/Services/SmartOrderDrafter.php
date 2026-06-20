<?php

declare(strict_types=1);

namespace App\Domain\Purchases\Services;

use App\Infrastructure\Eloquent\Models\AutoOrderLogModel;
use App\Infrastructure\Eloquent\Models\PurchaseOrderItemModel;
use App\Infrastructure\Eloquent\Models\PurchaseOrderModel;
use Illuminate\Support\Facades\DB;

class SmartOrderDrafter
{
    /**
     * جلب القطع الناقصة (تحت الحد الأدنى أو المخزون = 0)
     * مجمّعة حسب المورد الافتراضي
     */
    public function getLowStockBySupplier(string $tenantId, ?string $warehouseId = null): array
    {
        $thirtyDaysAgo = now()->subDays(30)->toDateString();

        // 1. حساب سرعة السحب اليومية (آخر 30 يوم) لكل منتج
        $velocitySubquery = DB::connection('tenant')
            ->table('stock_movements')
            ->select('product_id', DB::raw('SUM(quantity) / 30.0 as daily_velocity'))
            ->where('tenant_id', $tenantId)
            ->where('type', 'out') // Assuming 'out' is used for sales/consumption
            ->where('created_at', '>=', $thirtyDaysAgo);
        
        if ($warehouseId) {
            $velocitySubquery->where('warehouse_id', $warehouseId);
        }
        $velocitySubquery->groupBy('product_id');

        $driver = DB::connection('tenant')->getDriverName();
        $greatestFunc = $driver === 'sqlite' ? 'MAX' : 'GREATEST';

        // 2. دمج السحب اليومي مع المنتجات والمستودعات
        $query = DB::connection('tenant')
            ->table('products as p')
            ->join('warehouse_products as wp', 'p.id', '=', 'wp.product_id')
            ->leftJoinSub($velocitySubquery, 'v', 'p.id', '=', 'v.product_id')
            ->leftJoin('product_default_suppliers as pds', function ($join) use ($tenantId) {
                $join->on('p.id', '=', 'pds.product_id')
                     ->where('pds.tenant_id', $tenantId)
                     ->where('pds.priority', 1)
                     ->whereNull('pds.deleted_at');
            })
            ->leftJoin('suppliers as s', 'pds.supplier_id', '=', 's.id')
            ->leftJoin('supplier_ordering_schedules as sos', function ($join) use ($tenantId) {
                $join->on('s.id', '=', 'sos.supplier_id')
                     ->where('sos.tenant_id', $tenantId);
            })
            ->where('p.tenant_id', $tenantId)
            ->where('p.is_active', true)
            ->whereNull('p.deleted_at')
            ->where(function ($q) use ($greatestFunc) {
                // الشرط: المخزون أقل من الحد الأدنى الثابت أو أقل من مبيعات مدة التوريد الخاصة بالمورد (أو 14 يوم افتراضي)
                $q->where('wp.quantity', '<=', 0)
                  ->orWhereRaw("wp.quantity <= {$greatestFunc}(p.stock_alert_level, COALESCE(v.daily_velocity, 0) * COALESCE(sos.lead_time_days, 14))");
            })
            ->select(
                'p.id as product_id',
                'p.name', 'p.name_ar', 'p.sku', 'p.oem_number',
                'p.cost_price', 'p.stock_alert_level',
                'wp.quantity as current_stock',
                'wp.warehouse_id as target_warehouse_id',
                'pds.supplier_id',
                'pds.reorder_quantity',
                'pds.preferred_unit_price',
                's.name as supplier_name',
                DB::raw("COALESCE(sos.lead_time_days, 14) as lead_time_days"),
                DB::raw("COALESCE(v.daily_velocity, 0) as daily_velocity"),
                // الكمية المقترحة: الأكبر بين ضعف الحد الأدنى أو تغطية 30 يوماً من السحب
                DB::raw("{$greatestFunc}(p.stock_alert_level * 2, (COALESCE(v.daily_velocity, 0) * 30) - wp.quantity, 1) as suggested_qty")
            );

        if ($warehouseId) {
            $query->where('wp.warehouse_id', $warehouseId);
        }

        $items = $query->get();

        $productIds = $items->pluck('product_id')->unique()->toArray();
        $today = now()->toDateString();
        $activePrices = [];
        
        if (!empty($productIds)) {
            $activePrices = DB::connection('tenant')
                ->table('supplier_price_lists as spl')
                ->join('suppliers as s', 'spl.supplier_id', '=', 's.id')
                ->where('spl.tenant_id', $tenantId)
                ->whereIn('spl.product_id', $productIds)
                ->where('spl.is_active', true)
                ->whereNull('spl.deleted_at')
                ->where(function ($q) use ($today) {
                    $q->whereNull('spl.valid_until')
                      ->orWhere('spl.valid_until', '>=', $today);
                })
                ->select('spl.product_id', 'spl.supplier_id', 's.name as supplier_name', 'spl.unit_price', 'spl.min_quantity')
                ->get()
                ->groupBy('product_id');
        }

        // 3. جلب اقتراحات إعادة التوازن (المستودعات الأخرى التي لديها فائض)
        $surplusStock = [];
        if (!empty($productIds)) {
            $surplusQuery = DB::connection('tenant')
                ->table('warehouse_products as wp')
                ->join('warehouses as w', 'wp.warehouse_id', '=', 'w.id')
                ->join('products as p', 'wp.product_id', '=', 'p.id')
                ->where('w.tenant_id', $tenantId)
                ->whereIn('wp.product_id', $productIds)
                ->whereRaw('wp.quantity > p.stock_alert_level');
                
            if ($warehouseId) {
                // استبعاد المستودع الطالب
                $surplusQuery->where('wp.warehouse_id', '!=', $warehouseId);
            }
            
            $surplusStock = $surplusQuery->select(
                    'wp.product_id',
                    'wp.warehouse_id',
                    'w.name as warehouse_name',
                    DB::raw('(wp.quantity - p.stock_alert_level) as available_surplus')
                )
                ->get()
                ->groupBy('product_id');
        }

        // تجميع حسب المورد
        $bySupplier = [];
        $noSupplier = [];

        foreach ($items as $item) {
            $orderQty = (float) ($item->reorder_quantity > 0 ? $item->reorder_quantity : $item->suggested_qty);
            $currentPrice = (float) ($item->preferred_unit_price ?? $item->cost_price ?? 0);

            $cheaperAlternative = null;
            if (isset($activePrices[$item->product_id])) {
                foreach ($activePrices[$item->product_id] as $altPrice) {
                    if ($item->supplier_id && $altPrice->supplier_id === $item->supplier_id) continue;
                    
                    if ((float)$altPrice->unit_price < $currentPrice && (float)$altPrice->min_quantity <= $orderQty) {
                        if (!$cheaperAlternative || (float)$altPrice->unit_price < $cheaperAlternative['unit_price']) {
                            $cheaperAlternative = [
                                'supplier_id' => $altPrice->supplier_id,
                                'supplier_name' => $altPrice->supplier_name,
                                'unit_price' => (float) $altPrice->unit_price,
                                'min_quantity' => (float) $altPrice->min_quantity,
                            ];
                        }
                    }
                }
            }

            // تجميع اقتراحات الفائض للمنتج الحالي
            $rebalanceSuggestions = [];
            if (isset($surplusStock[$item->product_id])) {
                foreach ($surplusStock[$item->product_id] as $surplus) {
                    // إذا كان المستودع الحالي هو نفس مستودع الفائض يتم تخطيه
                    if ($warehouseId && $warehouseId === $surplus->warehouse_id) continue;
                    
                    $rebalanceSuggestions[] = [
                        'warehouse_id'      => $surplus->warehouse_id,
                        'warehouse_name'    => $surplus->warehouse_name,
                        'available_surplus' => (float) $surplus->available_surplus,
                    ];
                }
            }

            if ($item->supplier_id) {
                $supplierId = $item->supplier_id;
                if (!isset($bySupplier[$supplierId])) {
                    $bySupplier[$supplierId] = [
                        'supplier_id'   => $supplierId,
                        'supplier_name' => $item->supplier_name,
                        'items'         => [],
                    ];
                }
                $bySupplier[$supplierId]['items'][] = [
                    'product_id'    => $item->product_id,
                    'name'          => $item->name,
                    'name_ar'       => $item->name_ar,
                    'sku'           => $item->sku,
                    'oem_number'    => $item->oem_number,
                    'target_warehouse_id' => $item->target_warehouse_id,
                    'current_stock' => (float) $item->current_stock,
                    'min_stock'     => (int) $item->stock_alert_level,
                    'daily_velocity'=> round((float) $item->daily_velocity, 6),
                    'lead_time_days'=> (int) $item->lead_time_days,
                    'order_qty'     => $orderQty,
                    'unit_price'    => $currentPrice,
                    'cheaper_alternative' => $cheaperAlternative,
                    'rebalance_suggestions' => $rebalanceSuggestions,
                ];
            } else {
                $noSupplier[] = [
                    'product_id'    => $item->product_id,
                    'name'          => $item->name,
                    'name_ar'       => $item->name_ar,
                    'sku'           => $item->sku,
                    'oem_number'    => $item->oem_number,
                    'target_warehouse_id' => $item->target_warehouse_id,
                    'current_stock' => (float) $item->current_stock,
                    'min_stock'     => (int) $item->stock_alert_level,
                    'daily_velocity'=> round((float) $item->daily_velocity, 6),
                    'lead_time_days'=> (int) ($item->lead_time_days ?? 14),
                    'order_qty'     => $orderQty,
                    'unit_price'    => $currentPrice,
                    'cheaper_alternative' => $cheaperAlternative,
                    'rebalance_suggestions' => $rebalanceSuggestions,
                ];
            }
        }

        return [
            'by_supplier'    => array_values($bySupplier),
            'no_supplier'    => $noSupplier,
            'total_items'    => $items->count(),
            'suppliers_count' => count($bySupplier),
        ];
    }

    /**
     * إنشاء فاتورة مسودة لمورد واحد
     */
    public function draftOrderForSupplier(
        string  $supplierId,
        array   $items,
        string  $tenantId,
        string  $userId,
        ?string $warehouseId = null,
        string  $trigger = 'manual'
    ): PurchaseRequestModel {
        return DB::connection('tenant')->transaction(function () use (
            $supplierId, $items, $tenantId, $userId, $warehouseId, $trigger
        ) {
            // توليد رقم طلب الشراء
            $lastNum = PurchaseRequestModel::where('tenant_id', $tenantId)
                ->max(DB::raw("CAST(SUBSTR(request_number, 4) AS INTEGER)")) ?? 0;
            $prNumber = 'PR-' . str_pad((string) ($lastNum + 1), 6, '0', STR_PAD_LEFT);

            $pr = new PurchaseRequestModel([
                'request_number'         => $prNumber,
                'suggested_supplier_id'  => $supplierId,
                'department'             => 'Smart Drafter',
                'status'                 => 'pending_approval',
                'required_date'          => now()->addDays((int) ($items[0]['lead_time_days'] ?? 14)),
                'notes'                  => "📦 طلب شراء داخلي ذكي — {$trigger} — " . now()->format('Y-m-d H:i'),
                'created_by'             => $userId,
            ]);
            $pr->tenant_id = $tenantId;
            $pr->save();

            foreach ($items as $item) {
                $prItem = new PurchaseRequestItemModel([
                    'purchase_request_id' => $pr->id,
                    'product_id'          => $item['product_id'],
                    'quantity'            => $item['order_qty'],
                ]);
                $prItem->save();

                // حدّث last_purchase_date في SupplierPriceList لو موجود
                DB::connection('tenant')
                    ->table('supplier_price_lists')
                    ->where('tenant_id', $tenantId)
                    ->where('supplier_id', $supplierId)
                    ->where('product_id', $item['product_id'])
                    ->update(['last_purchase_date' => now()->toDateString()]);
            }

            // سجّل في الـ logs
            $log = new AutoOrderLogModel([
                'supplier_id'         => $supplierId,
                'purchase_order_id'   => $po->id,
                'trigger'             => $trigger,
                'items_count'         => count($items),
                'total_amount'        => $po->total,
            ]);
            $log->tenant_id = $tenantId;
            $log->save();

            return $pr;
        });
    }
}
