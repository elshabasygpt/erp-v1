<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Reports;

use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * SalesAnalyticsController
 *
 * Sales & inventory analytics reports:
 *  R1  - Revenue Analysis (by customer / product / category)
 *  R2  - Gross Margin by Product
 *  R3  - Inventory Aging (slow-moving stock)
 *  R4  - Customer Profitability
 *  R5  - Purchases Analysis (by supplier / product / category)
 *  R6  - Sales Rep Performance
 *  R7  - Return Rate by Product
 */
class SalesAnalyticsController extends BaseTenantController
{
    // =========================================================
    // R1 — Revenue Analysis  تحليل الإيرادات
    // =========================================================
    public function revenueAnalysis(Request $request): JsonResponse
    {
        $request->validate([
            'from'         => 'required|date',
            'to'           => 'required|date|after_or_equal:from',
            'group_by'     => 'nullable|in:customer,product,category',
            'compare_from' => 'nullable|date',
            'compare_to'   => 'nullable|date',
        ]);

        $tenantId = (string) $this->getTenantId($request);
        $from     = $request->get('from');
        $to       = $request->get('to');
        $groupBy  = $request->get('group_by', 'customer');

        $current = $this->buildRevenueBreakdown($tenantId, $from, $to, $groupBy);

        $compare = null;
        if ($request->has('compare_from') && $request->has('compare_to')) {
            $compare = $this->buildRevenueBreakdown(
                $tenantId,
                $request->get('compare_from'),
                $request->get('compare_to'),
                $groupBy
            );
        }

        // Add variance when comparing
        if ($compare) {
            $compareMap = collect($compare)->keyBy('group_key');
            $current = array_map(function ($row) use ($compareMap) {
                $prev = $compareMap->get($row['group_key']);
                $prevRev = $prev ? (float)$prev['revenue'] : 0.0;
                $row['compare_revenue'] = $prevRev;
                $row['variance']        = round($row['revenue'] - $prevRev, 2);
                $row['variance_pct']    = $prevRev > 0
                    ? round((($row['revenue'] - $prevRev) / $prevRev) * 100, 1)
                    : null;
                return $row;
            }, $current);
        }

        usort($current, fn($a, $b) => $b['revenue'] <=> $a['revenue']);

        $totalRevenue = array_sum(array_column($current, 'revenue'));
        $totalVat     = array_sum(array_column($current, 'vat'));

        // Add percentage share
        $current = array_map(function ($row) use ($totalRevenue) {
            $row['share_pct'] = $totalRevenue > 0
                ? round(($row['revenue'] / $totalRevenue) * 100, 1)
                : 0;
            return $row;
        }, $current);

        return $this->success([
            'period'        => ['from' => $from, 'to' => $to],
            'group_by'      => $groupBy,
            'rows'          => $current,
            'total_revenue' => round($totalRevenue, 2),
            'total_vat'     => round($totalVat, 2),
            'row_count'     => count($current),
        ]);
    }

    private function buildRevenueBreakdown(string $tenantId, string $from, string $to, string $groupBy): array
    {
        $query = DB::connection('tenant')->table('invoice_items')
            ->join('invoices', 'invoice_items.invoice_id', '=', 'invoices.id')
            ->where('invoices.tenant_id', $tenantId)
            ->where('invoices.status', 'confirmed')
            ->whereBetween('invoices.invoice_date', [$from, $to])
            ->whereNull('invoice_items.deleted_at');

        switch ($groupBy) {
            case 'product':
                $query->join('products', 'invoice_items.product_id', '=', 'products.id')
                    ->select(
                        'products.id as group_key',
                        'products.name as group_name',
                        'products.code as group_code',
                        DB::raw('SUM(invoice_items.total) as revenue'),
                        DB::raw('SUM(invoice_items.quantity) as quantity'),
                        DB::raw('SUM(invoice_items.total * (invoice_items.vat_rate/100) / (1 + invoice_items.vat_rate/100)) as vat')
                    )
                    ->groupBy('products.id', 'products.name', 'products.code');
                break;

            case 'category':
                $query->join('products', 'invoice_items.product_id', '=', 'products.id')
                    ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
                    ->select(
                        DB::raw('COALESCE(categories.id, \'no-category\') as group_key'),
                        DB::raw('COALESCE(categories.name, \'Uncategorized\') as group_name'),
                        DB::raw('NULL as group_code'),
                        DB::raw('SUM(invoice_items.total) as revenue'),
                        DB::raw('SUM(invoice_items.quantity) as quantity'),
                        DB::raw('SUM(invoice_items.total * (invoice_items.vat_rate/100) / (1 + invoice_items.vat_rate/100)) as vat')
                    )
                    ->groupBy('categories.id', 'categories.name');
                break;

            default: // customer
                $query->join('customers', 'invoices.customer_id', '=', 'customers.id')
                    ->select(
                        'customers.id as group_key',
                        'customers.name as group_name',
                        DB::raw('NULL as group_code'),
                        DB::raw('SUM(invoice_items.total) as revenue'),
                        DB::raw('COUNT(DISTINCT invoices.id) as quantity'),
                        DB::raw('SUM(invoices.vat_amount) as vat')
                    )
                    ->groupBy('customers.id', 'customers.name');
        }

        return $query->get()->map(fn($r) => [
            'group_key'  => $r->group_key,
            'group_name' => $r->group_name,
            'group_code' => $r->group_code ?? null,
            'revenue'    => round((float)$r->revenue, 2),
            'quantity'   => round((float)$r->quantity, 2),
            'vat'        => round((float)$r->vat, 2),
        ])->toArray();
    }

    // =========================================================
    // R2 — Gross Margin by Product  هامش الربح بالمنتج
    // =========================================================
    public function grossMarginByProduct(Request $request): JsonResponse
    {
        $request->validate([
            'from'        => 'required|date',
            'to'          => 'required|date|after_or_equal:from',
            'category_id' => 'nullable|uuid',
        ]);

        $tenantId   = (string) $this->getTenantId($request);
        $from       = $request->get('from');
        $to         = $request->get('to');
        $categoryId = $request->get('category_id');

        $query = DB::connection('tenant')->table('invoice_items')
            ->join('invoices', 'invoice_items.invoice_id', '=', 'invoices.id')
            ->join('products', 'invoice_items.product_id', '=', 'products.id')
            ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
            ->where('invoices.tenant_id', $tenantId)
            ->where('invoices.status', 'confirmed')
            ->whereBetween('invoices.invoice_date', [$from, $to])
            ->whereNull('invoice_items.deleted_at')
            ->select(
                'products.id',
                'products.code',
                'products.name',
                'products.name_ar',
                DB::raw('COALESCE(categories.name, \'Uncategorized\') as category'),
                DB::raw('SUM(invoice_items.quantity) as qty_sold'),
                DB::raw('SUM(invoice_items.total) as revenue'),
                // Use average_cost as the cost basis per unit
                DB::raw('SUM(invoice_items.quantity * products.average_cost) as cogs'),
                DB::raw('AVG(invoice_items.unit_price) as avg_sell_price'),
                DB::raw('AVG(products.average_cost) as avg_cost_price')
            )
            ->groupBy('products.id', 'products.code', 'products.name', 'products.name_ar', 'categories.name')
            ->orderBy('revenue', 'desc');

        if ($categoryId) {
            $query->where('products.category_id', $categoryId);
        }

        $rows = $query->get()->map(function ($r) {
            $revenue    = (float)$r->revenue;
            $cogs       = (float)$r->cogs;
            $grossProfit = $revenue - $cogs;
            $margin      = $revenue > 0 ? round(($grossProfit / $revenue) * 100, 2) : 0;

            return [
                'id'             => $r->id,
                'code'           => $r->code,
                'name'           => $r->name,
                'name_ar'        => $r->name_ar,
                'category'       => $r->category,
                'qty_sold'       => round((float)$r->qty_sold, 2),
                'revenue'        => round($revenue, 2),
                'cogs'           => round($cogs, 2),
                'gross_profit'   => round($grossProfit, 2),
                'margin_pct'     => $margin,
                'avg_sell_price' => round((float)$r->avg_sell_price, 2),
                'avg_cost_price' => round((float)$r->avg_cost_price, 2),
            ];
        });

        $totalRevenue    = $rows->sum('revenue');
        $totalCogs       = $rows->sum('cogs');
        $totalGrossProfit = $rows->sum('gross_profit');

        return $this->success([
            'period'            => ['from' => $from, 'to' => $to],
            'products'          => $rows->values(),
            'total_revenue'     => round($totalRevenue, 2),
            'total_cogs'        => round($totalCogs, 2),
            'total_gross_profit'=> round($totalGrossProfit, 2),
            'overall_margin_pct'=> $totalRevenue > 0
                ? round(($totalGrossProfit / $totalRevenue) * 100, 2)
                : 0,
        ]);
    }

    // =========================================================
    // R3 — Inventory Aging  تقادم المخزون
    // =========================================================
    public function inventoryAging(Request $request): JsonResponse
    {
        $tenantId   = (string) $this->getTenantId($request);
        $categoryId = $request->get('category_id');
        $today      = now()->toDateString();

        // Last sale date per product via invoice_items
        $lastSales = DB::connection('tenant')->table('invoice_items')
            ->join('invoices', 'invoice_items.invoice_id', '=', 'invoices.id')
            ->where('invoices.tenant_id', $tenantId)
            ->where('invoices.status', 'confirmed')
            ->selectRaw('invoice_items.product_id, MAX(invoices.invoice_date) as last_sale_date')
            ->groupBy('invoice_items.product_id')
            ->get()
            ->keyBy('product_id');

        $query = DB::connection('tenant')->table('products')
            ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
            ->where('products.tenant_id', $tenantId)
            ->whereNull('products.deleted_at')
            ->where('products.current_stock', '>', 0)
            ->select(
                'products.id',
                'products.code',
                'products.name',
                'products.name_ar',
                'products.current_stock',
                'products.average_cost',
                'products.cost_price',
                DB::raw('COALESCE(categories.name, \'Uncategorized\') as category')
            );

        if ($categoryId) {
            $query->where('products.category_id', $categoryId);
        }

        $products = $query->get();

        $buckets = [
            'current'   => ['label' => '0-30 days',   'items' => [], 'total_value' => 0],
            'days_31_60'=> ['label' => '31-60 days',  'items' => [], 'total_value' => 0],
            'days_61_90'=> ['label' => '61-90 days',  'items' => [], 'total_value' => 0],
            'days_91_120'=>['label' => '91-120 days', 'items' => [], 'total_value' => 0],
            'over_120'  => ['label' => '120+ days',   'items' => [], 'total_value' => 0],
            'never_sold'=> ['label' => 'Never Sold',  'items' => [], 'total_value' => 0],
        ];

        $grandTotalValue = 0.0;

        foreach ($products as $product) {
            $lastSaleDate = $lastSales[$product->id]->last_sale_date ?? null;
            $stockValue   = round((float)$product->current_stock * (float)$product->average_cost, 2);
            $grandTotalValue += $stockValue;

            $row = [
                'id'           => $product->id,
                'code'         => $product->code,
                'name'         => $product->name,
                'name_ar'      => $product->name_ar,
                'category'     => $product->category,
                'current_stock'=> (float)$product->current_stock,
                'avg_cost'     => round((float)$product->average_cost, 2),
                'stock_value'  => $stockValue,
                'last_sale_date' => $lastSaleDate,
            ];

            if (!$lastSaleDate) {
                $row['days_since_sale'] = null;
                $buckets['never_sold']['items'][] = $row;
                $buckets['never_sold']['total_value'] += $stockValue;
            } else {
                $days = (int)\Carbon\Carbon::parse($lastSaleDate)->diffInDays(now());
                $row['days_since_sale'] = $days;

                if ($days <= 30) {
                    $buckets['current']['items'][] = $row;
                    $buckets['current']['total_value'] += $stockValue;
                } elseif ($days <= 60) {
                    $buckets['days_31_60']['items'][] = $row;
                    $buckets['days_31_60']['total_value'] += $stockValue;
                } elseif ($days <= 90) {
                    $buckets['days_61_90']['items'][] = $row;
                    $buckets['days_61_90']['total_value'] += $stockValue;
                } elseif ($days <= 120) {
                    $buckets['days_91_120']['items'][] = $row;
                    $buckets['days_91_120']['total_value'] += $stockValue;
                } else {
                    $buckets['over_120']['items'][] = $row;
                    $buckets['over_120']['total_value'] += $stockValue;
                }
            }
        }

        // Round totals and add pcts
        foreach ($buckets as $key => $bucket) {
            $buckets[$key]['total_value'] = round($bucket['total_value'], 2);
            $buckets[$key]['count']       = count($bucket['items']);
            $buckets[$key]['value_pct']   = $grandTotalValue > 0
                ? round(($bucket['total_value'] / $grandTotalValue) * 100, 1)
                : 0;
        }

        return $this->success([
            'as_of'            => $today,
            'buckets'          => $buckets,
            'grand_total_value'=> round($grandTotalValue, 2),
            'total_products'   => $products->count(),
        ]);
    }

    // =========================================================
    // R4 — Customer Profitability  ربحية العميل
    // =========================================================
    public function customerProfitability(Request $request): JsonResponse
    {
        $request->validate([
            'from' => 'required|date',
            'to'   => 'required|date|after_or_equal:from',
        ]);

        $tenantId = (string) $this->getTenantId($request);
        $from     = $request->get('from');
        $to       = $request->get('to');

        // Revenue per customer
        $revenues = DB::connection('tenant')->table('invoices')
            ->join('customers', 'invoices.customer_id', '=', 'customers.id')
            ->where('invoices.tenant_id', $tenantId)
            ->where('invoices.status', 'confirmed')
            ->whereBetween('invoices.invoice_date', [$from, $to])
            ->select(
                'customers.id',
                'customers.name',
                'customers.phone',
                DB::raw('COUNT(invoices.id) as invoice_count'),
                DB::raw('SUM(invoices.subtotal) as revenue_net'),
                DB::raw('SUM(invoices.vat_amount) as total_vat'),
                DB::raw('SUM(invoices.total) as revenue_gross')
            )
            ->groupBy('customers.id', 'customers.name', 'customers.phone')
            ->get()
            ->keyBy('id');

        // COGS per customer via invoice_items × average_cost
        $cogs = DB::connection('tenant')->table('invoice_items')
            ->join('invoices', 'invoice_items.invoice_id', '=', 'invoices.id')
            ->join('products', 'invoice_items.product_id', '=', 'products.id')
            ->where('invoices.tenant_id', $tenantId)
            ->where('invoices.status', 'confirmed')
            ->whereBetween('invoices.invoice_date', [$from, $to])
            ->whereNull('invoice_items.deleted_at')
            ->select(
                'invoices.customer_id',
                DB::raw('SUM(invoice_items.quantity * products.average_cost) as cogs')
            )
            ->groupBy('invoices.customer_id')
            ->get()
            ->keyBy('customer_id');

        // Returns per customer
        $returns = DB::connection('tenant')->table('sales_returns')
            ->where('tenant_id', $tenantId)
            ->whereBetween('return_date', [$from, $to])
            ->select(
                'customer_id',
                DB::raw('SUM(total_amount) as return_total')
            )
            ->groupBy('customer_id')
            ->get()
            ->keyBy('customer_id');

        $rows = $revenues->map(function ($rev) use ($cogs, $returns) {
            $revenue    = (float)$rev->revenue_net;
            $cust_cogs  = (float)($cogs[$rev->id]->cogs ?? 0);
            $ret_total  = (float)($returns[$rev->id]->return_total ?? 0);
            $netRevenue = $revenue - $ret_total;
            $grossProfit = $netRevenue - $cust_cogs;
            $margin      = $netRevenue > 0 ? round(($grossProfit / $netRevenue) * 100, 2) : 0;

            return [
                'customer_id'    => $rev->id,
                'customer_name'  => $rev->name,
                'phone'          => $rev->phone,
                'invoice_count'  => (int)$rev->invoice_count,
                'gross_revenue'  => round((float)$rev->revenue_gross, 2),
                'net_revenue'    => round($netRevenue, 2),
                'returns'        => round($ret_total, 2),
                'cogs'           => round($cust_cogs, 2),
                'gross_profit'   => round($grossProfit, 2),
                'margin_pct'     => $margin,
                'avg_order_value'=> $rev->invoice_count > 0
                    ? round((float)$rev->revenue_gross / $rev->invoice_count, 2)
                    : 0,
            ];
        })->values()->sortByDesc('gross_profit')->values();

        $grandRevenue    = $rows->sum('net_revenue');
        $grandCogs       = $rows->sum('cogs');
        $grandGrossProfit= $rows->sum('gross_profit');

        return $this->success([
            'period'             => ['from' => $from, 'to' => $to],
            'customers'          => $rows,
            'total_revenue'      => round($grandRevenue, 2),
            'total_cogs'         => round($grandCogs, 2),
            'total_gross_profit' => round($grandGrossProfit, 2),
            'overall_margin_pct' => $grandRevenue > 0
                ? round(($grandGrossProfit / $grandRevenue) * 100, 2)
                : 0,
        ]);
    }

    // =========================================================
    // R5 — Purchases Analysis  تحليل المشتريات
    // =========================================================
    public function purchasesAnalysis(Request $request): JsonResponse
    {
        $request->validate([
            'from'         => 'required|date',
            'to'           => 'required|date|after_or_equal:from',
            'group_by'     => 'nullable|in:supplier,product,category',
            'compare_from' => 'nullable|date',
            'compare_to'   => 'nullable|date',
        ]);

        $tenantId = (string) $this->getTenantId($request);
        $from     = $request->get('from');
        $to       = $request->get('to');
        $groupBy  = $request->get('group_by', 'supplier');

        $current = $this->buildPurchasesBreakdown($tenantId, $from, $to, $groupBy);

        $compare = null;
        if ($request->has('compare_from') && $request->has('compare_to')) {
            $compare = $this->buildPurchasesBreakdown(
                $tenantId,
                $request->get('compare_from'),
                $request->get('compare_to'),
                $groupBy
            );
        }

        if ($compare) {
            $compareMap = collect($compare)->keyBy('group_key');
            $current = array_map(function ($row) use ($compareMap) {
                $prev = $compareMap->get($row['group_key']);
                $prevAmt = $prev ? (float)$prev['amount'] : 0.0;
                $row['compare_amount'] = $prevAmt;
                $row['variance']       = round($row['amount'] - $prevAmt, 2);
                $row['variance_pct']   = $prevAmt > 0
                    ? round((($row['amount'] - $prevAmt) / $prevAmt) * 100, 1)
                    : null;
                return $row;
            }, $current);
        }

        usort($current, fn($a, $b) => $b['amount'] <=> $a['amount']);
        $totalAmount = array_sum(array_column($current, 'amount'));

        $current = array_map(function ($row) use ($totalAmount) {
            $row['share_pct'] = $totalAmount > 0
                ? round(($row['amount'] / $totalAmount) * 100, 1)
                : 0;
            return $row;
        }, $current);

        return $this->success([
            'period'       => ['from' => $from, 'to' => $to],
            'group_by'     => $groupBy,
            'rows'         => $current,
            'total_amount' => round($totalAmount, 2),
            'row_count'    => count($current),
        ]);
    }

    private function buildPurchasesBreakdown(string $tenantId, string $from, string $to, string $groupBy): array
    {
        $query = DB::connection('tenant')->table('purchase_invoice_items')
            ->join('purchase_invoices', 'purchase_invoice_items.purchase_invoice_id', '=', 'purchase_invoices.id')
            ->where('purchase_invoices.tenant_id', $tenantId)
            ->where('purchase_invoices.status', 'confirmed')
            ->whereBetween('purchase_invoices.invoice_date', [$from, $to])
            ->whereNull('purchase_invoice_items.deleted_at');

        switch ($groupBy) {
            case 'product':
                $query->join('products', 'purchase_invoice_items.product_id', '=', 'products.id')
                    ->select(
                        'products.id as group_key',
                        'products.name as group_name',
                        'products.code as group_code',
                        DB::raw('SUM(purchase_invoice_items.total) as amount'),
                        DB::raw('SUM(purchase_invoice_items.quantity) as quantity')
                    )
                    ->groupBy('products.id', 'products.name', 'products.code');
                break;

            case 'category':
                $query->join('products', 'purchase_invoice_items.product_id', '=', 'products.id')
                    ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
                    ->select(
                        DB::raw('COALESCE(categories.id, \'no-category\') as group_key'),
                        DB::raw('COALESCE(categories.name, \'Uncategorized\') as group_name'),
                        DB::raw('NULL as group_code'),
                        DB::raw('SUM(purchase_invoice_items.total) as amount'),
                        DB::raw('SUM(purchase_invoice_items.quantity) as quantity')
                    )
                    ->groupBy('categories.id', 'categories.name');
                break;

            default: // supplier
                $query->join('suppliers', 'purchase_invoices.supplier_id', '=', 'suppliers.id')
                    ->select(
                        'suppliers.id as group_key',
                        'suppliers.name as group_name',
                        DB::raw('NULL as group_code'),
                        DB::raw('SUM(purchase_invoice_items.total) as amount'),
                        DB::raw('COUNT(DISTINCT purchase_invoices.id) as quantity')
                    )
                    ->groupBy('suppliers.id', 'suppliers.name');
        }

        return $query->get()->map(fn($r) => [
            'group_key'  => $r->group_key,
            'group_name' => $r->group_name,
            'group_code' => $r->group_code ?? null,
            'amount'     => round((float)$r->amount, 2),
            'quantity'   => round((float)$r->quantity, 2),
        ])->toArray();
    }

    // =========================================================
    // R6 — Sales Rep Performance  أداء مندوبي المبيعات
    // =========================================================
    public function salesRepPerformance(Request $request): JsonResponse
    {
        $request->validate([
            'from' => 'required|date',
            'to'   => 'required|date|after_or_equal:from',
        ]);

        $tenantId = (string) $this->getTenantId($request);
        $from     = $request->get('from');
        $to       = $request->get('to');

        // Invoices by salesperson
        $rows = DB::connection('tenant')->table('invoices')
            ->leftJoin('users', 'invoices.salesperson_id', '=', 'users.id')
            ->where('invoices.tenant_id', $tenantId)
            ->where('invoices.status', 'confirmed')
            ->whereBetween('invoices.invoice_date', [$from, $to])
            ->select(
                DB::raw('COALESCE(invoices.salesperson_id::text, \'unassigned\') as rep_id'),
                DB::raw("COALESCE(users.name, 'Unassigned') as rep_name"),
                DB::raw('COUNT(invoices.id) as invoice_count'),
                DB::raw('SUM(invoices.subtotal) as net_revenue'),
                DB::raw('SUM(invoices.vat_amount) as total_vat'),
                DB::raw('SUM(invoices.total) as gross_revenue'),
                DB::raw('SUM(invoices.paid_amount) as collected')
            )
            ->groupBy('invoices.salesperson_id', 'users.name')
            ->orderBy('net_revenue', 'desc')
            ->get();

        // COGS per salesperson
        $cogsMap = DB::connection('tenant')->table('invoice_items')
            ->join('invoices', 'invoice_items.invoice_id', '=', 'invoices.id')
            ->join('products', 'invoice_items.product_id', '=', 'products.id')
            ->where('invoices.tenant_id', $tenantId)
            ->where('invoices.status', 'confirmed')
            ->whereBetween('invoices.invoice_date', [$from, $to])
            ->whereNull('invoice_items.deleted_at')
            ->selectRaw('COALESCE(invoices.salesperson_id::text, \'unassigned\') as rep_id, SUM(invoice_items.quantity * products.average_cost) as cogs')
            ->groupBy('invoices.salesperson_id')
            ->get()
            ->keyBy('rep_id');

        // Commission sum
        $commissionMap = DB::connection('tenant')->table('invoice_items')
            ->join('invoices', 'invoice_items.invoice_id', '=', 'invoices.id')
            ->where('invoices.tenant_id', $tenantId)
            ->where('invoices.status', 'confirmed')
            ->whereBetween('invoices.invoice_date', [$from, $to])
            ->whereNull('invoice_items.deleted_at')
            ->selectRaw('COALESCE(invoices.salesperson_id::text, \'unassigned\') as rep_id, SUM(invoice_items.commission_amount) as commission')
            ->groupBy('invoices.salesperson_id')
            ->get()
            ->keyBy('rep_id');

        $totalRevenue = 0.0;
        $result = $rows->map(function ($row) use ($cogsMap, $commissionMap, &$totalRevenue) {
            $netRevenue  = (float)$row->net_revenue;
            $cogs        = (float)($cogsMap[$row->rep_id]->cogs ?? 0);
            $grossProfit = $netRevenue - $cogs;
            $commission  = (float)($commissionMap[$row->rep_id]->commission ?? 0);
            $totalRevenue += $netRevenue;

            return [
                'rep_id'         => $row->rep_id,
                'rep_name'       => $row->rep_name,
                'invoice_count'  => (int)$row->invoice_count,
                'net_revenue'    => round($netRevenue, 2),
                'gross_revenue'  => round((float)$row->gross_revenue, 2),
                'collected'      => round((float)$row->collected, 2),
                'collection_rate'=> $row->gross_revenue > 0
                    ? round(((float)$row->collected / (float)$row->gross_revenue) * 100, 1)
                    : 0,
                'cogs'           => round($cogs, 2),
                'gross_profit'   => round($grossProfit, 2),
                'margin_pct'     => $netRevenue > 0
                    ? round(($grossProfit / $netRevenue) * 100, 2)
                    : 0,
                'commission'     => round($commission, 2),
                'avg_invoice'    => $row->invoice_count > 0
                    ? round($netRevenue / $row->invoice_count, 2)
                    : 0,
            ];
        });

        $result = $result->map(function ($row) use ($totalRevenue) {
            $row['share_pct'] = $totalRevenue > 0
                ? round(($row['net_revenue'] / $totalRevenue) * 100, 1)
                : 0;
            return $row;
        })->values();

        return $this->success([
            'period'        => ['from' => $from, 'to' => $to],
            'reps'          => $result,
            'total_revenue' => round($totalRevenue, 2),
            'rep_count'     => $result->count(),
        ]);
    }

    // =========================================================
    // R7 — Return Rate by Product  معدل الإرجاع بالمنتج
    // =========================================================
    public function returnRateByProduct(Request $request): JsonResponse
    {
        $request->validate([
            'from'        => 'required|date',
            'to'          => 'required|date|after_or_equal:from',
            'category_id' => 'nullable|uuid',
        ]);

        $tenantId   = (string) $this->getTenantId($request);
        $from       = $request->get('from');
        $to         = $request->get('to');
        $categoryId = $request->get('category_id');

        // Qty sold per product
        $soldQuery = DB::connection('tenant')->table('invoice_items')
            ->join('invoices', 'invoice_items.invoice_id', '=', 'invoices.id')
            ->join('products', 'invoice_items.product_id', '=', 'products.id')
            ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
            ->where('invoices.tenant_id', $tenantId)
            ->where('invoices.status', 'confirmed')
            ->whereBetween('invoices.invoice_date', [$from, $to])
            ->whereNull('invoice_items.deleted_at')
            ->select(
                'products.id',
                'products.code',
                'products.name',
                'products.name_ar',
                DB::raw('COALESCE(categories.name, \'Uncategorized\') as category'),
                DB::raw('SUM(invoice_items.quantity) as qty_sold'),
                DB::raw('SUM(invoice_items.total) as revenue')
            )
            ->groupBy('products.id', 'products.code', 'products.name', 'products.name_ar', 'categories.name');

        if ($categoryId) {
            $soldQuery->where('products.category_id', $categoryId);
        }

        $sold = $soldQuery->get()->keyBy('id');

        // Qty returned per product
        $returned = DB::connection('tenant')->table('sales_return_items')
            ->join('sales_returns', 'sales_return_items.sales_return_id', '=', 'sales_returns.id')
            ->where('sales_returns.tenant_id', $tenantId)
            ->whereBetween('sales_returns.return_date', [$from, $to])
            ->whereNull('sales_return_items.deleted_at')
            ->select(
                'sales_return_items.product_id',
                DB::raw('SUM(sales_return_items.quantity) as qty_returned'),
                DB::raw('SUM(sales_return_items.total) as return_value')
            )
            ->groupBy('sales_return_items.product_id')
            ->get()
            ->keyBy('product_id');

        $rows = $sold->map(function ($s) use ($returned) {
            $qtySold     = (float)$s->qty_sold;
            $qtyReturned = (float)($returned[$s->id]->qty_returned ?? 0);
            $returnValue = (float)($returned[$s->id]->return_value ?? 0);
            $returnRate  = $qtySold > 0 ? round(($qtyReturned / $qtySold) * 100, 2) : 0;

            return [
                'id'            => $s->id,
                'code'          => $s->code,
                'name'          => $s->name,
                'name_ar'       => $s->name_ar,
                'category'      => $s->category,
                'qty_sold'      => $qtySold,
                'qty_returned'  => $qtyReturned,
                'return_rate'   => $returnRate,
                'revenue'       => round((float)$s->revenue, 2),
                'return_value'  => round($returnValue, 2),
                'net_revenue'   => round((float)$s->revenue - $returnValue, 2),
            ];
        })->values()->sortByDesc('return_rate')->values();

        $totalSold     = $rows->sum('qty_sold');
        $totalReturned = $rows->sum('qty_returned');

        return $this->success([
            'period'           => ['from' => $from, 'to' => $to],
            'products'         => $rows,
            'total_qty_sold'   => $totalSold,
            'total_qty_returned'=> $totalReturned,
            'overall_return_rate'=> $totalSold > 0
                ? round(($totalReturned / $totalSold) * 100, 2)
                : 0,
        ]);
    }
}
