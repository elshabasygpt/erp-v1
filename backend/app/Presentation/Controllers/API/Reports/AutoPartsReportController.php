<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Reports;

use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AutoPartsReportController extends BaseTenantController
{
    public function slowMovingParts(Request $request): JsonResponse
    {
        $tenantId  = $this->getTenantId($request);
        $days      = (int) $request->query('days', '90');
        $wId       = $request->query('warehouse_id');
        $catId     = $request->query('category_id');
        $minStock  = (int) $request->query('min_stock', '1');

        $cacheKey = "slow_moving_{$tenantId}_{$days}_{$wId}_{$catId}_{$minStock}";

        $data = Cache::remember($cacheKey, 1800, function () use ($tenantId, $days, $wId, $catId, $minStock) {

            // آخر تاريخ بيع لكل منتج
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
                    DB::raw('ROUND(wp.quantity * wp.average_cost, 2) as stock_value'),
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
                    'total_stock_value' => round($results->sum('stock_value'), 6),
                    'never_sold_count'  => $results->whereNull('last_sale_date')->count(),
                    'avg_days_no_sale'  => round(
                        $results->where('days_since_last_sale', '<', 9999)->avg('days_since_last_sale') ?? 0
                    ),
                ],
            ];
        });

        return $this->success($data);
    }

    public function topPartsByMake(Request $request): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $dateFrom = $request->query('date_from', now()->startOfMonth()->toDateString());
        $dateTo   = $request->query('date_to', now()->toDateString());
        $makeId   = $request->query('make_id');
        $limit    = (int) $request->query('limit', '20');

        $cacheKey = "top_by_make_{$tenantId}_{$dateFrom}_{$dateTo}_{$makeId}_{$limit}";

        $data = Cache::remember($cacheKey, 1800, function () use ($tenantId, $dateFrom, $dateTo, $makeId, $limit) {

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
                    DB::raw('ROUND(SUM(ii.quantity * ii.unit_price * (1 - COALESCE(ii.discount_percent,0)/100)), 2) as revenue'),
                    DB::raw('ROUND(SUM(ii.quantity * COALESCE(ii.cost_price, p.cost_price, 0)), 2) as cogs'),
                    DB::raw('ROUND(SUM(ii.quantity * ii.unit_price * (1 - COALESCE(ii.discount_percent,0)/100))
                                - SUM(ii.quantity * COALESCE(ii.cost_price, p.cost_price, 0)), 2) as gross_profit')
                )
                ->groupBy('vmk.id','vmk.name','vmk.name_ar','p.id','p.name','p.name_ar','p.sku','p.brand')
                ->orderByDesc('revenue')
                ->limit($limit);

            if ($makeId) $query->where('vmk.id', $makeId);

            $items = $query->get();

            $totalRevenue = $items->sum('revenue');

            // تجميع حسب الماركة
            $byMake = $items->groupBy('make_id')->map(function ($makeItems, $mId) use ($totalRevenue) {
                $first = $makeItems->first();
                return [
                    'make_id'       => $mId,
                    'make_name'     => $first->make_name,
                    'make_name_ar'  => $first->make_name_ar,
                    'total_revenue' => round($makeItems->sum('revenue'), 6),
                    'total_qty'     => $makeItems->sum('total_qty'),
                    'items_count'   => $makeItems->count(),
                    'revenue_share' => $totalRevenue > 0 ? round($makeItems->sum('revenue') / $totalRevenue * 100, 1) : 0,
                    'top_parts'     => $makeItems->take(5)->values(),
                ];
            })->values()->sortByDesc('total_revenue')->values();

            return [
                'by_make'   => $byMake,
                'all_items' => $items->values(),
                'total_revenue' => round($totalRevenue, 6),
            ];
        });

        return $this->success($data);
    }

    public function missingParts(Request $request): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $wId      = $request->query('warehouse_id');
        $makeId   = $request->query('make_id');

        $cacheKey = "missing_parts_{$tenantId}_{$wId}_{$makeId}";

        $data = Cache::remember($cacheKey, 900, function () use ($tenantId, $wId, $makeId) { // 15 دقيقة فقط — بيانات حيوية

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

            // آخر 30 يوم بيع — لحساب مستوى الإلحاح
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

        return $this->success($data);
    }

    public function deadStockByMonths(Request $request): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $wId      = $request->query('warehouse_id');
        $catId    = $request->query('category_id');
        $minStock = (int) $request->query('min_stock', '1');

        $cacheKey = "dead_stock_months_{$tenantId}_{$wId}_{$catId}_{$minStock}";

        $data = Cache::remember($cacheKey, 1800, function () use ($tenantId, $wId, $catId, $minStock) {

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
                ->select(
                    'p.id', 'p.name', 'p.name_ar', 'p.sku', 'p.brand', 'p.quality_grade',
                    'p.cost_price', 'p.sell_price',
                    'wp.quantity as stock_quantity',
                    'wp.average_cost',
                    DB::raw('ROUND(wp.quantity * COALESCE(wp.average_cost, p.cost_price, 0), 2) as stock_value'),
                    'c.name as category_name', 'c.name_ar as category_name_ar',
                    'ls.last_sale_date',
                    'ls.total_sold_ever',
                    DB::raw("COALESCE(NOW()::date - ls.last_sale_date::date, 9999) as days_since_last_sale"),
                    DB::raw("CASE
                        WHEN ls.last_sale_date IS NULL                                          THEN 'never'
                        WHEN NOW()::date - ls.last_sale_date::date <= 90                        THEN '1_3m'
                        WHEN NOW()::date - ls.last_sale_date::date <= 180                       THEN '3_6m'
                        WHEN NOW()::date - ls.last_sale_date::date <= 365                       THEN '6_12m'
                        ELSE '12m_plus'
                    END as bucket")
                )
                ->orderByDesc('stock_value');

            if ($wId)   $query->where('wp.warehouse_id', $wId);
            if ($catId) $query->where('p.category_id', $catId);

            $results = $query->limit(500)->get();

            // تجميع حسب الفئة الزمنية
            $buckets = [
                'never'    => ['label' => 'لم تُباع أبداً', 'label_en' => 'Never Sold',       'color' => 'red',    'items' => [], 'total_value' => 0, 'count' => 0],
                '12m_plus' => ['label' => 'أكثر من 12 شهر', 'label_en' => '12+ Months',       'color' => 'red',    'items' => [], 'total_value' => 0, 'count' => 0],
                '6_12m'    => ['label' => '6 - 12 شهر',    'label_en' => '6–12 Months',       'color' => 'orange', 'items' => [], 'total_value' => 0, 'count' => 0],
                '3_6m'     => ['label' => '3 - 6 أشهر',    'label_en' => '3–6 Months',        'color' => 'yellow', 'items' => [], 'total_value' => 0, 'count' => 0],
                '1_3m'     => ['label' => '1 - 3 أشهر',    'label_en' => '1–3 Months',        'color' => 'blue',   'items' => [], 'total_value' => 0, 'count' => 0],
            ];

            foreach ($results as $item) {
                $b = $item->bucket;
                if (!isset($buckets[$b])) continue;
                $buckets[$b]['items'][]     = $item;
                $buckets[$b]['total_value'] += (float) $item->stock_value;
                $buckets[$b]['count']++;
            }

            // أقصى 50 عنصر لكل فئة في الاستجابة
            foreach ($buckets as &$bucket) {
                $bucket['total_value'] = round($bucket['total_value'], 2);
                $bucket['items']       = array_slice($bucket['items'], 0, 50);
            }
            unset($bucket);

            return [
                'buckets' => $buckets,
                'summary' => [
                    'total_items'       => $results->count(),
                    'total_stock_value' => round((float) $results->sum('stock_value'), 2),
                    'never_sold_count'  => $results->where('bucket', 'never')->count(),
                    'over_12m_count'    => $results->where('bucket', '12m_plus')->count(),
                    'over_6m_count'     => $results->whereIn('bucket', ['6_12m', '12m_plus', 'never'])->count(),
                ],
            ];
        });

        return $this->success($data);
    }

    public function turnoverByMake(Request $request): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $dateFrom = $request->query('date_from', now()->startOfYear()->toDateString());
        $dateTo   = $request->query('date_to', now()->toDateString());
        $wId      = $request->query('warehouse_id');

        $cacheKey = "turnover_by_make_{$tenantId}_{$dateFrom}_{$dateTo}_{$wId}";

        $data = Cache::remember($cacheKey, 1800, function () use ($tenantId, $dateFrom, $dateTo, $wId) {

            $periodDays = max(1, now()->parse($dateFrom)->diffInDays(now()->parse($dateTo)) + 1);

            // مبيعات وتكلفة المبيعات لكل ماركة سيارة خلال الفترة
            $salesQuery = DB::connection('tenant')
                ->table('invoice_items as ii')
                ->join('invoices as inv',                     'ii.invoice_id',       '=', 'inv.id')
                ->join('products as p',                       'ii.product_id',        '=', 'p.id')
                ->join('product_vehicle_compatibility as pvc', 'p.id',               '=', 'pvc.product_id')
                ->join('vehicle_years as vy',                 'pvc.vehicle_year_id', '=', 'vy.id')
                ->join('vehicle_models as vm',                'vy.model_id',         '=', 'vm.id')
                ->join('vehicle_makes as vmk',                'vm.make_id',          '=', 'vmk.id')
                ->where('inv.tenant_id', $tenantId)
                ->where('inv.status', 'confirmed')
                ->whereBetween('inv.invoice_date', [$dateFrom, $dateTo])
                ->select(
                    'vmk.id as make_id',
                    'vmk.name as make_name',
                    'vmk.name_ar as make_name_ar',
                    DB::raw('COUNT(DISTINCT p.id) as products_sold'),
                    DB::raw('SUM(ii.quantity) as units_sold'),
                    DB::raw('ROUND(SUM(ii.quantity * COALESCE(ii.cost_price, p.cost_price, 0)), 2) as cogs'),
                    DB::raw('ROUND(SUM(ii.quantity * ii.unit_price * (1 - COALESCE(ii.discount_percent,0)/100)), 2) as revenue')
                )
                ->groupBy('vmk.id', 'vmk.name', 'vmk.name_ar');

            $salesData = $salesQuery->get()->keyBy('make_id');

            // قيمة المخزون الحالية لكل ماركة سيارة
            $invQuery = DB::connection('tenant')
                ->table('warehouse_products as wp')
                ->join('products as p',                       'wp.product_id',        '=', 'p.id')
                ->join('product_vehicle_compatibility as pvc', 'p.id',               '=', 'pvc.product_id')
                ->join('vehicle_years as vy',                 'pvc.vehicle_year_id', '=', 'vy.id')
                ->join('vehicle_models as vm',                'vy.model_id',         '=', 'vm.id')
                ->join('vehicle_makes as vmk',                'vm.make_id',          '=', 'vmk.id')
                ->where('p.tenant_id', $tenantId)
                ->where('p.is_active', true)
                ->select(
                    'vmk.id as make_id',
                    'vmk.name as make_name',
                    'vmk.name_ar as make_name_ar',
                    DB::raw('COUNT(DISTINCT p.id) as total_skus'),
                    DB::raw('SUM(wp.quantity) as total_units'),
                    DB::raw('ROUND(SUM(wp.quantity * COALESCE(wp.average_cost, p.cost_price, 0)), 2) as inventory_value')
                )
                ->groupBy('vmk.id', 'vmk.name', 'vmk.name_ar');

            if ($wId) $invQuery->where('wp.warehouse_id', $wId);

            $invData = $invQuery->get();

            // دمج البيانات وحساب معدل الدوران
            $results = $invData->map(function ($inv) use ($salesData, $periodDays) {
                $sale = $salesData->get($inv->make_id);

                $cogs          = (float) ($sale?->cogs ?? 0);
                $invValue      = (float) $inv->inventory_value;
                // تحويل التكلفة إلى سنوي ثم قسمة على متوسط المخزون
                $annualCogs    = $periodDays > 0 ? $cogs * (365 / $periodDays) : 0;
                $turnoverRatio = $invValue > 0 ? round($annualCogs / $invValue, 2) : 0;
                $dsi           = $turnoverRatio > 0 ? round(365 / $turnoverRatio, 0) : null; // Days Sales Inventory

                return [
                    'make_id'        => $inv->make_id,
                    'make_name'      => $inv->make_name,
                    'make_name_ar'   => $inv->make_name_ar,
                    'total_skus'     => (int) $inv->total_skus,
                    'total_units'    => (float) $inv->total_units,
                    'inventory_value'=> (float) $inv->inventory_value,
                    'units_sold'     => (float) ($sale?->units_sold ?? 0),
                    'cogs'           => $cogs,
                    'revenue'        => (float) ($sale?->revenue ?? 0),
                    'turnover_ratio' => $turnoverRatio,
                    'dsi_days'       => $dsi,
                    'performance'    => match(true) {
                        $turnoverRatio >= 6  => 'excellent',
                        $turnoverRatio >= 3  => 'good',
                        $turnoverRatio >= 1  => 'average',
                        $turnoverRatio > 0   => 'slow',
                        default              => 'no_sales',
                    },
                ];
            })->sortByDesc('turnover_ratio')->values();

            $totalInvValue = $results->sum('inventory_value');

            return [
                'items'  => $results,
                'period' => ['date_from' => $dateFrom, 'date_to' => $dateTo, 'days' => $periodDays],
                'summary' => [
                    'total_makes'          => $results->count(),
                    'total_inventory_value'=> round((float) $totalInvValue, 2),
                    'total_cogs'           => round((float) $results->sum('cogs'), 2),
                    'avg_turnover_ratio'   => round((float) $results->where('turnover_ratio', '>', 0)->avg('turnover_ratio'), 2),
                    'excellent_count'      => $results->where('performance', 'excellent')->count(),
                    'slow_count'           => $results->whereIn('performance', ['slow', 'no_sales'])->count(),
                ],
            ];
        });

        return $this->success($data);
    }

    public function topPartsByModel(Request $request): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $dateFrom = $request->query('date_from', now()->startOfMonth()->toDateString());
        $dateTo   = $request->query('date_to', now()->toDateString());
        $makeId   = $request->query('make_id');
        $modelId  = $request->query('model_id');
        $limit    = (int) $request->query('limit', '10');

        $cacheKey = "top_by_model_{$tenantId}_{$dateFrom}_{$dateTo}_{$makeId}_{$modelId}_{$limit}";

        $data = Cache::remember($cacheKey, 1800, function () use ($tenantId, $dateFrom, $dateTo, $makeId, $modelId, $limit) {

            $query = DB::connection('tenant')
                ->table('invoice_items as ii')
                ->join('invoices as inv',                     'ii.invoice_id',       '=', 'inv.id')
                ->join('products as p',                       'ii.product_id',        '=', 'p.id')
                ->join('product_vehicle_compatibility as pvc', 'p.id',               '=', 'pvc.product_id')
                ->join('vehicle_years as vy',                 'pvc.vehicle_year_id', '=', 'vy.id')
                ->join('vehicle_models as vm',                'vy.model_id',         '=', 'vm.id')
                ->join('vehicle_makes as vmk',                'vm.make_id',          '=', 'vmk.id')
                ->where('inv.tenant_id', $tenantId)
                ->where('inv.status', 'confirmed')
                ->whereBetween('inv.invoice_date', [$dateFrom, $dateTo])
                ->select(
                    'vmk.id as make_id',
                    'vmk.name as make_name',
                    'vmk.name_ar as make_name_ar',
                    'vm.id as model_id',
                    'vm.name as model_name',
                    'vm.name_ar as model_name_ar',
                    'p.id as product_id',
                    'p.name as product_name',
                    'p.name_ar as product_name_ar',
                    'p.sku', 'p.brand', 'p.quality_grade',
                    DB::raw('SUM(ii.quantity) as total_qty'),
                    DB::raw('COUNT(DISTINCT ii.invoice_id) as order_count'),
                    DB::raw('ROUND(SUM(ii.quantity * ii.unit_price * (1 - COALESCE(ii.discount_percent,0)/100)), 2) as revenue'),
                    DB::raw('ROUND(SUM(ii.quantity * COALESCE(ii.cost_price, p.cost_price, 0)), 2) as cogs'),
                    DB::raw('ROUND(SUM(ii.quantity * ii.unit_price * (1 - COALESCE(ii.discount_percent,0)/100))
                                - SUM(ii.quantity * COALESCE(ii.cost_price, p.cost_price, 0)), 2) as gross_profit')
                )
                ->groupBy(
                    'vmk.id','vmk.name','vmk.name_ar',
                    'vm.id','vm.name','vm.name_ar',
                    'p.id','p.name','p.name_ar','p.sku','p.brand','p.quality_grade'
                )
                ->orderByDesc('total_qty');

            if ($makeId)  $query->where('vmk.id', $makeId);
            if ($modelId) $query->where('vm.id', $modelId);

            $items = $query->limit($limit * 20)->get();

            // تجميع حسب الموديل مع أعلى القطع لكل موديل
            $byModel = $items->groupBy('model_id')->map(function ($modelItems) use ($limit) {
                $first = $modelItems->first();
                $topParts = $modelItems->sortByDesc('total_qty')->take($limit)->values();
                return [
                    'make_id'      => $first->make_id,
                    'make_name'    => $first->make_name,
                    'make_name_ar' => $first->make_name_ar,
                    'model_id'     => $first->model_id,
                    'model_name'   => $first->model_name,
                    'model_name_ar'=> $first->model_name_ar,
                    'total_revenue'=> round((float) $modelItems->sum('revenue'), 2),
                    'total_qty'    => (float) $modelItems->sum('total_qty'),
                    'skus_sold'    => $modelItems->count(),
                    'top_parts'    => $topParts,
                ];
            })->sortByDesc('total_qty')->values();

            return [
                'by_model'      => $byModel,
                'total_revenue' => round((float) $items->sum('revenue'), 2),
                'total_qty'     => (float) $items->sum('total_qty'),
                'models_count'  => $byModel->count(),
            ];
        });

        return $this->success($data);
    }

    public function profitByBrand(Request $request): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $dateFrom = $request->query('date_from', now()->startOfYear()->toDateString());
        $dateTo   = $request->query('date_to', now()->toDateString());
        $groupBy  = $request->query('group_by', 'brand'); // brand | quality_grade

        $cacheKey = "profit_brand_{$tenantId}_{$dateFrom}_{$dateTo}_{$groupBy}";

        $data = Cache::remember($cacheKey, 1800, function () use ($tenantId, $dateFrom, $dateTo, $groupBy) {

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
                    DB::raw('ROUND(SUM(ii.quantity * ii.unit_price * (1 - COALESCE(ii.discount_percent,0)/100)), 2) as revenue'),
                    DB::raw('ROUND(SUM(ii.quantity * COALESCE(ii.cost_price, p.cost_price, 0)), 2) as cogs'),
                    DB::raw('ROUND(SUM(ii.quantity * ii.unit_price * (1 - COALESCE(ii.discount_percent,0)/100))
                                - SUM(ii.quantity * COALESCE(ii.cost_price, p.cost_price, 0)), 2) as gross_profit'),
                    DB::raw('ROUND(
                        CASE WHEN SUM(ii.quantity * ii.unit_price * (1 - COALESCE(ii.discount_percent,0)/100)) > 0
                             THEN (SUM(ii.quantity * ii.unit_price * (1 - COALESCE(ii.discount_percent,0)/100))
                                  - SUM(ii.quantity * COALESCE(ii.cost_price, p.cost_price, 0)))
                                  / NULLIF(SUM(ii.quantity * ii.unit_price * (1 - COALESCE(ii.discount_percent,0)/100)), 0) * 100
                             ELSE 0 END, 2) as profit_margin_pct')
                )
                ->groupBy($groupField)
                ->orderByDesc('revenue')
                ->get();

            $totalRevenue = $results->sum('revenue');

            return [
                'group_by' => $groupBy,
                'items'    => $results->map(function ($r) use ($totalRevenue) {
                    $r->revenue_share_pct = $totalRevenue > 0
                        ? round($r->revenue / $totalRevenue * 100, 1) : 0;
                    return $r;
                })->values(),
                'totals' => [
                    'total_revenue'      => round($totalRevenue, 6),
                    'total_cogs'         => round($results->sum('cogs'), 6),
                    'total_gross_profit' => round($results->sum('gross_profit'), 6),
                    'avg_margin'         => round($results->avg('profit_margin_pct'), 1),
                ],
            ];
        });

        return $this->success($data);
    }
}
