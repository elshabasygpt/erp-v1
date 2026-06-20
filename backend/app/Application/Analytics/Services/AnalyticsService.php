<?php

namespace App\Application\Analytics\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class AnalyticsService
{
    private const CACHE_TTL = 3600; // 60 minutes

    public function __construct(
        private readonly string $tenantId
    ) {}

    private function getCacheKey(string $reportName, array $params): string
    {
        ksort($params);

        return "analytics_{$reportName}_".md5(json_encode($params))."_tenant_{$this->tenantId}";
    }

    public function getSalesPerformance(array $filters = []): array
    {
        $startDate = $filters['start_date'] ?? now()->subDays(30)->toDateString();
        $endDate = $filters['end_date'] ?? now()->toDateString();
        $interval = $filters['interval'] ?? 'day';

        $cacheKey = $this->getCacheKey('sales_performance', $filters);

        $data = Cache::remember($cacheKey, self::CACHE_TTL, function () use ($startDate, $endDate, $interval) {
            $driver = DB::connection('tenant')->getDriverName();
            $dateFormat = match ($interval) {
                'month' => $driver === 'sqlite' ? "strftime('%Y-%m', invoice_date)" : "TO_CHAR(invoice_date, 'YYYY-MM')",
                'week' => $driver === 'sqlite' ? "strftime('%Y-%W', invoice_date)" : "TO_CHAR(DATE_TRUNC('week', invoice_date), 'YYYY-MM-DD')",
                default => $driver === 'sqlite' ? "strftime('%Y-%m-%d', invoice_date)" : "TO_CHAR(invoice_date, 'YYYY-MM-DD')"
            };

            return DB::connection('tenant')->table('invoices')->where('tenant_id', $this->tenantId)
                ->where('status', 'confirmed')
                ->whereBetween('invoice_date', [$startDate, $endDate])
                ->select(
                    DB::raw("$dateFormat as period"),
                    DB::raw('SUM(subtotal - discount_amount) as revenue'),
                    DB::raw('COUNT(id) as invoices_count'),
                    DB::raw('SUM(discount_amount) as total_discount')
                )
                ->groupBy('period')
                ->orderBy('period')
                ->get();
        });

        return $data->toArray();
    }

    public function getProfitabilityAnalysis(array $filters = []): array
    {
        $startDate = $filters['start_date'] ?? now()->startOfYear()->toDateString();
        $endDate = $filters['end_date'] ?? now()->toDateString();
        $dimension = $filters['dimension'] ?? 'product';

        $cacheKey = $this->getCacheKey('profitability', $filters);

        $data = Cache::remember($cacheKey, self::CACHE_TTL, function () use ($startDate, $endDate, $dimension) {
            $query = DB::connection('tenant')->table('invoice_items')->where('invoice_items.tenant_id', $this->tenantId)
                ->join('invoices', 'invoice_items.invoice_id', '=', 'invoices.id')
                ->where('invoices.status', 'confirmed')
                ->whereBetween('invoices.invoice_date', [$startDate, $endDate]);

            $revenueSql = 'invoice_items.quantity * invoice_items.unit_price * (1 - COALESCE(invoice_items.discount_percent, 0) / 100)';
            $cogsSql = 'invoice_items.quantity * COALESCE(invoice_items.cost_price, 0)';

            if ($dimension === 'branch') {
                return $query->join('branches', 'invoices.branch_id', '=', 'branches.id')
                    ->select(
                        'branches.id as entity_id',
                        'branches.name as entity_name',
                        DB::raw("SUM($revenueSql) as revenue"),
                        DB::raw("SUM($cogsSql) as cogs"),
                        DB::raw("SUM($revenueSql - $cogsSql) as gross_profit")
                    )
                    ->groupBy('branches.id', 'branches.name')
                    ->orderByDesc('gross_profit')
                    ->get();
            } elseif ($dimension === 'salesperson') {
                return $query->join('users', 'invoices.salesperson_id', '=', 'users.id')
                    ->select(
                        'users.id as entity_id',
                        'users.name as entity_name',
                        DB::raw("SUM($revenueSql) as revenue"),
                        DB::raw("SUM($cogsSql) as cogs"),
                        DB::raw("SUM($revenueSql - $cogsSql) as gross_profit")
                    )
                    ->groupBy('users.id', 'users.name')
                    ->orderByDesc('gross_profit')
                    ->get();
            } else {
                return $query->join('products', 'invoice_items.product_id', '=', 'products.id')
                    ->select(
                        'products.id as entity_id',
                        'products.name as entity_name',
                        DB::raw('SUM(invoice_items.quantity) as units_sold'),
                        DB::raw("SUM($revenueSql) as revenue"),
                        DB::raw("SUM($cogsSql) as cogs"),
                        DB::raw("SUM($revenueSql - $cogsSql) as gross_profit")
                    )
                    ->groupBy('products.id', 'products.name')
                    ->orderByDesc('gross_profit')
                    ->limit(50)
                    ->get();
            }
        });

        return $data->toArray();
    }

    public function getSalesByChannel(array $filters = []): array
    {
        $startDate = $filters['start_date'] ?? now()->startOfMonth()->toDateString();
        $endDate = $filters['end_date'] ?? now()->toDateString();

        $cacheKey = $this->getCacheKey('sales_channel', $filters);

        $data = Cache::remember($cacheKey, self::CACHE_TTL, function () use ($startDate, $endDate) {
            return DB::connection('tenant')->table('invoices')->where('tenant_id', $this->tenantId)
                ->where('status', 'confirmed')
                ->whereBetween('invoice_date', [$startDate, $endDate])
                ->select(
                    DB::raw("COALESCE(sales_channel_name, 'Direct/Instore') as channel"),
                    DB::raw('SUM(subtotal - discount_amount) as revenue'),
                    DB::raw('COUNT(id) as orders_count')
                )
                ->groupBy('channel')
                ->orderByDesc('revenue')
                ->get();
        });

        return $data->toArray();
    }

    public function getReturnsAnalysis(array $filters = []): array
    {
        $startDate = $filters['start_date'] ?? now()->startOfMonth()->toDateString();
        $endDate = $filters['end_date'] ?? now()->toDateString();

        $cacheKey = $this->getCacheKey('returns_analysis', $filters);

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($startDate, $endDate) {
            $totalSales = DB::connection('tenant')->table('invoices')->where('tenant_id', $this->tenantId)
                ->where('status', 'confirmed')
                ->whereBetween('invoice_date', [$startDate, $endDate])
                ->sum(DB::raw('subtotal - discount_amount'));

            $returns = DB::connection('tenant')->table('sales_returns')->where('tenant_id', $this->tenantId)
                ->where('status', 'completed')
                ->whereBetween('return_date', [$startDate, $endDate])
                ->select(
                    DB::raw("COALESCE(reason, 'Unspecified') as reason"),
                    DB::raw('SUM(subtotal) as returned_value'),
                    DB::raw('COUNT(id) as return_count')
                )
                ->groupBy('reason')
                ->orderByDesc('returned_value')
                ->get();

            $totalReturned = $returns->sum('returned_value');
            $returnRate = $totalSales > 0 ? ($totalReturned / $totalSales) * 100 : 0;

            return [
                'total_sales' => (float) $totalSales,
                'total_returned' => (float) $totalReturned,
                'return_rate_percent' => round($returnRate, 6),
                'breakdown_by_reason' => $returns,
            ];
        });
    }

    public function getCustomerLifetimeValue(array $filters = []): array
    {
        $cacheKey = $this->getCacheKey('customer_lifetime_value', $filters);

        return Cache::remember($cacheKey, self::CACHE_TTL, function () {
            $metrics = DB::connection('tenant')->table('invoices')->where('tenant_id', $this->tenantId)
                ->where('status', 'confirmed')
                ->whereNotNull('customer_id')
                ->select(
                    DB::raw('COUNT(DISTINCT customer_id) as total_customers'),
                    DB::raw('COUNT(id) as total_orders'),
                    DB::raw('SUM(subtotal - discount_amount) as total_revenue')
                )
                ->first();

            $totalCustomers = $metrics->total_customers ?? 0;
            if ($totalCustomers == 0) {
                return ['historical_clv' => 0, 'average_order_value' => 0, 'purchase_frequency' => 0, 'top_lifetime_customers' => []];
            }

            $averageOrderValue = $metrics->total_revenue / $metrics->total_orders;
            $purchaseFrequency = $metrics->total_orders / $totalCustomers;

            $historicalClv = $averageOrderValue * $purchaseFrequency;

            $topCustomers = DB::connection('tenant')->table('invoices')->where('invoices.tenant_id', $this->tenantId)
                ->join('customers', 'invoices.customer_id', '=', 'customers.id')
                ->where('invoices.status', 'confirmed')
                ->select(
                    'customers.id',
                    'customers.name',
                    'customers.segment',
                    DB::raw('SUM(invoices.subtotal - invoices.discount_amount) as total_spent'),
                    DB::raw('COUNT(invoices.id) as order_count')
                )
                ->groupBy('customers.id', 'customers.name', 'customers.segment')
                ->orderByDesc('total_spent')
                ->limit(10)
                ->get();

            return [
                'average_order_value' => round((float) $averageOrderValue, 6),
                'purchase_frequency' => round((float) $purchaseFrequency, 6),
                'historical_clv' => round((float) $historicalClv, 6),
                'top_lifetime_customers' => $topCustomers,
            ];
        });
    }

    public function getDiscountAnalysis(array $filters = []): array
    {
        $startDate = $filters['start_date'] ?? now()->startOfMonth()->toDateString();
        $endDate = $filters['end_date'] ?? now()->toDateString();

        $cacheKey = $this->getCacheKey('discount_analysis', $filters);

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($startDate, $endDate) {
            $metrics = DB::connection('tenant')->table('invoices')->where('tenant_id', $this->tenantId)
                ->where('status', 'confirmed')
                ->whereBetween('invoice_date', [$startDate, $endDate])
                ->select(
                    DB::raw('SUM(subtotal) as gross_sales'),
                    DB::raw('SUM(discount_amount) as total_discounts')
                )
                ->first();

            $grossSales = (float) ($metrics->gross_sales ?? 0);
            $totalDiscounts = (float) ($metrics->total_discounts ?? 0);
            $discountRate = $grossSales > 0 ? ($totalDiscounts / $grossSales) * 100 : 0;

            $discountsBySalesperson = DB::connection('tenant')->table('invoices')->where('invoices.tenant_id', $this->tenantId)
                ->join('users', 'invoices.salesperson_id', '=', 'users.id')
                ->where('invoices.status', 'confirmed')
                ->whereBetween('invoices.invoice_date', [$startDate, $endDate])
                ->where('invoices.discount_amount', '>', 0)
                ->select(
                    'users.name as salesperson_name',
                    DB::raw('SUM(invoices.discount_amount) as total_discount_given'),
                    DB::raw('COUNT(invoices.id) as discounted_invoices_count')
                )
                ->groupBy('users.id', 'users.name')
                ->orderByDesc('total_discount_given')
                ->limit(10)
                ->get();

            return [
                'gross_sales' => $grossSales,
                'total_discounts' => $totalDiscounts,
                'average_discount_rate_percent' => round($discountRate, 6),
                'discounts_by_salesperson' => $discountsBySalesperson,
            ];
        });
    }

    public function getTopCategories(array $filters = []): array
    {
        $startDate = $filters['start_date'] ?? now()->startOfMonth()->toDateString();
        $endDate = $filters['end_date'] ?? now()->toDateString();

        $cacheKey = $this->getCacheKey('top_categories', $filters);

        $data = Cache::remember($cacheKey, self::CACHE_TTL, function () use ($startDate, $endDate) {
            $revenueSql = 'invoice_items.quantity * invoice_items.unit_price * (1 - COALESCE(invoice_items.discount_percent, 0) / 100)';

            return DB::connection('tenant')->table('invoice_items')->where('invoice_items.tenant_id', $this->tenantId)
                ->join('invoices', 'invoice_items.invoice_id', '=', 'invoices.id')
                ->join('products', 'invoice_items.product_id', '=', 'products.id')
                ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
                ->where('invoices.status', 'confirmed')
                ->whereBetween('invoices.invoice_date', [$startDate, $endDate])
                ->select(
                    DB::raw("COALESCE(categories.name, 'Standard') as product_type"),
                    DB::raw("SUM($revenueSql) as revenue"),
                    DB::raw('SUM(invoice_items.quantity) as units_sold')
                )
                ->groupBy('product_type')
                ->orderByDesc('revenue')
                ->limit(10)
                ->get();
        });

        return $data->toArray();
    }

    public function getConversionFunnel(array $filters = []): array
    {
        $startDate = $filters['start_date'] ?? now()->startOfYear()->toDateString();
        $endDate = $filters['end_date'] ?? now()->toDateString();

        $cacheKey = $this->getCacheKey('conversion_funnel', $filters);

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($startDate, $endDate) {
            $quotations = DB::connection('tenant')->table('quotations')->where('tenant_id', $this->tenantId)
                ->whereBetween('quotation_date', [$startDate, $endDate])
                ->count();

            $salesOrders = DB::connection('tenant')->table('sales_orders')->where('tenant_id', $this->tenantId)
                ->whereBetween('order_date', [$startDate, $endDate])
                ->count();

            $convertedInvoices = DB::connection('tenant')->table('invoices')->where('tenant_id', $this->tenantId)
                ->whereBetween('invoice_date', [$startDate, $endDate])
                ->whereNotNull('reference_no')
                ->count();

            return [
                'total_quotations' => $quotations,
                'total_sales_orders' => $salesOrders,
                'converted_to_invoice' => $convertedInvoices,
                'quotation_to_so_conversion_rate' => $quotations > 0 ? round(($salesOrders / $quotations) * 100, 6) : 0,
                'so_to_invoice_conversion_rate' => $salesOrders > 0 ? round(($convertedInvoices / $salesOrders) * 100, 6) : 0,
            ];
        });
    }
}
