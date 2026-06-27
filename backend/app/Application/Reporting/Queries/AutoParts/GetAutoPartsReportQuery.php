<?php

declare(strict_types=1);

namespace App\Application\Reporting\Queries\AutoParts;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class GetAutoPartsReportQuery
{
    public function getSlowMovingParts(string $tenantId, int $days, ?string $wId, ?string $catId, int $minStock): array
    {
        $cacheKey = "slow_moving_{$tenantId}_{$days}_{$wId}_{$catId}_{$minStock}";

        return Cache::remember($cacheKey, 1800, function () use ($tenantId, $days, $wId, $catId, $minStock) {
            $lastSale = DB::connection('tenant')
                ->table('invoice_items')
                ->join('invoices', 'invoice_items.invoice_id', '=', 'invoices.id')
                ->where('invoices.tenant_id', $tenantId)
                ->where('invoices.status', 'confirmed')
                ->select(
                    'invoice_items.product_id',
                    DB::raw('MAX(invoices.invoice_date) as last_sale_date'),
                    DB::raw('SUM(invoice_items.quantity) as total_sold_ever')
                )
                ->groupBy('invoice_items.product_id');

            $query = DB::connection('tenant')
                ->table('warehouse_products as wp')
                ->join('products as p', 'wp.product_id', '=', 'p.id')
                ->leftJoinSub($lastSale, 'ls', 'p.id', '=', 'ls.product_id')
                ->leftJoin('categories as c', 'p.category_id', '=', 'c.id')
                ->where('p.tenant_id', $tenantId)
                ->where('p.is_active', true)
                ->where('wp.quantity', '>=', $minStock)
                ->where(function ($q) use ($days) {
                    $q->whereNull('ls.last_sale_date')
                      ->orWhere('ls.last_sale_date', '<', now()->subDays($days)->toDateString());
                })
                ->select(
                    'p.id', 'p.name', 'p.name_ar', 'p.sku', 'p.brand', 'p.quality_grade',
                    'p.cost_price', 'p.sell_price',
                    'wp.quantity as stock_quantity',
                    'wp.average_cost',
                    DB::raw('ROUND(wp.quantity * wp.average_cost, 6) as stock_value'),
                    'c.name as category_name', 'c.name_ar as category_name_ar',
                    'ls.last_sale_date',
                    'ls.total_sold_ever',
                    DB::raw("COALESCE(NOW()::date - ls.last_sale_date::date, 9999) as days_since_last_sale")
                )
                ->orderByDesc('stock_value');

            if ($wId)   $query->where('wp.warehouse_id', $wId);
            if ($catId) $query->where('p.category_id', $catId);

            $results = $query->limit(100)->get();

            return [
                'items' => $results,
                'summary' => [
                    'total_items'       => $results->count(),
                    'total_stock_value' => round((float) $results->sum('stock_value'), 6),
                    'never_sold_count'  => $results->whereNull('last_sale_date')->count(),
                    'avg_days_no_sale'  => round(
                        (float) ($results->where('days_since_last_sale', '<', 9999)->avg('days_since_last_sale') ?? 0)
                    ),
                ],
            ];
        });
    }

    public function getTopPartsByMake(string $tenantId, string $dateFrom, string $dateTo, ?string $makeId, int $limit): array
    {
        $cacheKey = "top_by_make_{$tenantId}_{$dateFrom}_{$dateTo}_{$makeId}_{$limit}";

        return Cache::remember($cacheKey, 1800, function () use ($tenantId, $dateFrom, $dateTo, $makeId, $limit) {
            $query = DB::connection('tenant')
                ->table('invoice_items as ii')
                ->join('invoices as inv',                    'ii.invoice_id', '=', 'inv.id')
                ->join('products as p',                      'ii.product_id', '=', 'p.id')
                ->join('product_vehicle_compatibility as pvc','p.id',         '=', 'pvc.product_id')
                ->join('vehicle_years as vy',                'pvc.vehicle_year_id', '=', 'vy.id')
                ->join('vehicle_models as vm',               'vy.model_id',   '=', 'vm.id')
                ->join('vehicle_makes as vmk',               'vm.make_id',    '=', 'vmk.id')
                ->where('inv.tenant_id', $tenantId)
                ->where('inv.status', 'confirmed')
                ->whereBetween('inv.invoice_date', [$dateFrom, $dateTo])
                ->select(
                    'vmk.id as make_id',
                    'vmk.name as make_name',
                    'vmk.name_ar as make_name_ar',
                    'p.id as product_id',
                    'p.name as product_name',
                    'p.name_ar as product_name_ar',
                    'p.sku', 'p.brand',
                    DB::raw('SUM(ii.quantity) as total_qty'),
                    DB::raw('ROUND(SUM(ii.quantity * ii.unit_price * (1 - COALESCE(ii.discount_percent,0)/100)), 6) as revenue'),
                    DB::raw('ROUND(SUM(ii.quantity * COALESCE(ii.cost_price, p.cost_price, 0)), 6) as cogs'),
                    DB::raw('ROUND(SUM(ii.quantity * ii.unit_price * (1 - COALESCE(ii.discount_percent,0)/100))
                                - SUM(ii.quantity * COALESCE(ii.cost_price, p.cost_price, 0)), 6) as gross_profit')
                )
                ->groupBy('vmk.id','vmk.name','vmk.name_ar','p.id','p.name','p.name_ar','p.sku','p.brand')
                ->orderByDesc('revenue')
                ->limit($limit);

            if ($makeId) $query->where('vmk.id', $makeId);

            $items = $query->get();

            $totalRevenue = $items->sum('revenue');

            $byMake = $items->groupBy('make_id')->map(function ($makeItems, $mId) use ($totalRevenue) {
                $first = $makeItems->first();
                return [
                    'make_id'       => $mId,
                    'make_name'     => $first->make_name,
                    'make_name_ar'  => $first->make_name_ar,
                    'total_revenue' => round((float) $makeItems->sum('revenue'), 6),
                    'total_qty'     => (float) $makeItems->sum('total_qty'),
                    'items_count'   => $makeItems->count(),
                    'revenue_share' => $totalRevenue > 0 ? round((float) $makeItems->sum('revenue') / $totalRevenue * 100, 1) : 0,
                    'top_parts'     => $makeItems->take(5)->values(),
                ];
            })->values()->sortByDesc('total_revenue')->values();

            return [
                'by_make'   => $byMake,
                'all_items' => $items->values(),
                'total_revenue' => round((float) $totalRevenue, 6),
            ];
        });
    }

    public function getMissingParts(string $tenantId, ?string $wId, ?string $makeId): array
    {
        $cacheKey = "missing_parts_{$tenantId}_{$wId}_{$makeId}";

        return Cache::remember($cacheKey, 900, function () use ($tenantId, $wId, $makeId) {
            $query = DB::connection('tenant')
                ->table('products as p')
                ->join('warehouse_products as wp', 'p.id', '=', 'wp.product_id')
                ->leftJoin('product_vehicle_compatibility as pvc', 'p.id', '=', 'pvc.product_id')
                ->leftJoin('vehicle_years as vy',   'pvc.vehicle_year_id', '=', 'vy.id')
                ->leftJoin('vehicle_models as vm',  'vy.model_id',         '=', 'vm.id')
                ->leftJoin('vehicle_makes as vmk',  'vm.make_id',          '=', 'vmk.id')
                ->where('p.tenant_id', $tenantId)
                ->where('p.is_active', true)
                ->where(function ($q) {
                    $q->where('wp.quantity', '<=', 0)
                      ->orWhereColumn('wp.quantity', '<=', 'p.stock_alert_level');
                })
                ->select(
                    'p.id', 'p.name', 'p.name_ar', 'p.sku', 'p.brand', 'p.quality_grade',
                    'p.cost_price', 'p.sell_price',
                    'p.stock_alert_level as min_stock',
                    'wp.quantity as current_stock',
                    DB::raw("STRING_AGG(DISTINCT vmk.name_ar, ', ') as compatible_makes_ar"),
                    DB::raw("STRING_AGG(DISTINCT vmk.name, ', ')    as compatible_makes")
                )
                ->groupBy(
                    'p.id','p.name','p.name_ar','p.sku','p.brand','p.quality_grade',
                    'p.cost_price','p.sell_price','p.stock_alert_level','wp.quantity'
                );

            if ($wId)    $query->where('wp.warehouse_id', $wId);
            if ($makeId) $query->where('vmk.id', $makeId);

            $items = $query->orderBy('wp.quantity')->limit(100)->get();

            $productIds  = $items->pluck('id');
            $recentSales = DB::connection('tenant')
                ->table('invoice_items as ii')
                ->join('invoices as inv', 'ii.invoice_id', '=', 'inv.id')
                ->where('inv.tenant_id', $tenantId)
                ->where('inv.status', 'confirmed')
                ->where('inv.invoice_date', '>=', now()->subDays(30)->toDateString())
                ->whereIn('ii.product_id', $productIds)
                ->select('ii.product_id', DB::raw('SUM(ii.quantity) as sold_last_30_days'))
                ->groupBy('ii.product_id')
                ->get()->keyBy('product_id');

            $enriched = $items->map(function ($item) use ($recentSales) {
                $sold = (float) ($recentSales->get($item->id)?->sold_last_30_days ?? 0);
                $item->sold_last_30_days = $sold;
                $item->urgency = match(true) {
                    $item->current_stock <= 0 && $sold > 0 => 'critical',
                    $item->current_stock <= 0              => 'high',
                    default                                => 'medium',
                };
                return $item;
            })->sortByDesc(fn($i) => match($i->urgency) {
                'critical' => 3, 'high' => 2, default => 1
            })->values();

            return [
                'items' => $enriched,
                'summary' => [
                    'critical_count' => $enriched->where('urgency', 'critical')->count(),
                    'high_count'     => $enriched->where('urgency', 'high')->count(),
                    'medium_count'   => $enriched->where('urgency', 'medium')->count(),
                    'total_out'      => $enriched->where('current_stock', '<=', 0)->count(),
                ],
            ];
        });
    }

    public function getProfitByBrand(string $tenantId, string $dateFrom, string $dateTo, string $groupBy): array
    {
        $cacheKey = "profit_brand_{$tenantId}_{$dateFrom}_{$dateTo}_{$groupBy}";

        return Cache::remember($cacheKey, 1800, function () use ($tenantId, $dateFrom, $dateTo, $groupBy) {
            $groupField = $groupBy === 'quality_grade' ? 'p.quality_grade' : 'p.brand';

            $results = DB::connection('tenant')
                ->table('invoice_items as ii')
                ->join('invoices as inv', 'ii.invoice_id', '=', 'inv.id')
                ->join('products as p',   'ii.product_id', '=', 'p.id')
                ->where('inv.tenant_id', $tenantId)
                ->where('inv.status', 'confirmed')
                ->whereBetween('inv.invoice_date', [$dateFrom, $dateTo])
                ->whereNotNull($groupField)
                ->where($groupField, '!=', '')
                ->select(
                    DB::raw("$groupField as group_key"),
                    DB::raw('COUNT(DISTINCT ii.invoice_id) as invoices_count'),
                    DB::raw('COUNT(DISTINCT p.id) as products_count'),
                    DB::raw('SUM(ii.quantity) as total_qty'),
                    DB::raw('ROUND(SUM(ii.quantity * ii.unit_price * (1 - COALESCE(ii.discount_percent,0)/100)), 6) as revenue'),
                    DB::raw('ROUND(SUM(ii.quantity * COALESCE(ii.cost_price, p.cost_price, 0)), 6) as cogs'),
                    DB::raw('ROUND(SUM(ii.quantity * ii.unit_price * (1 - COALESCE(ii.discount_percent,0)/100))
                                - SUM(ii.quantity * COALESCE(ii.cost_price, p.cost_price, 0)), 6) as gross_profit'),
                    DB::raw('ROUND(
                        CASE WHEN SUM(ii.quantity * ii.unit_price * (1 - COALESCE(ii.discount_percent,0)/100)) > 0
                             THEN (SUM(ii.quantity * ii.unit_price * (1 - COALESCE(ii.discount_percent,0)/100))
                                  - SUM(ii.quantity * COALESCE(ii.cost_price, p.cost_price, 0)))
                                  / NULLIF(SUM(ii.quantity * ii.unit_price * (1 - COALESCE(ii.discount_percent,0)/100)), 0) * 100
                             ELSE 0 END, 6) as profit_margin_pct')
                )
                ->groupBy($groupField)
                ->orderByDesc('revenue')
                ->get();

            $totalRevenue = $results->sum('revenue');

            return [
                'group_by' => $groupBy,
                'items'    => $results->map(function ($r) use ($totalRevenue) {
                    $r->revenue_share_pct = $totalRevenue > 0
                        ? round((float) $r->revenue / $totalRevenue * 100, 1) : 0;
                    return $r;
                })->values(),
                'totals' => [
                    'total_revenue'      => round((float) $totalRevenue, 6),
                    'total_cogs'         => round((float) $results->sum('cogs'), 6),
                    'total_gross_profit' => round((float) $results->sum('gross_profit'), 6),
                    'avg_margin'         => round((float) $results->avg('profit_margin_pct'), 1),
                ],
            ];
        });
    }
}
