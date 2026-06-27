<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Sales;

use App\Infrastructure\Eloquent\Models\InvoiceModel;
use App\Infrastructure\Eloquent\Models\SalesReturnModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdvancedSalesReportController extends BaseTenantController
{
    private function getDateRange(Request $request): array
    {
        $dateFrom = $request->query('date_from', now()->startOfMonth()->toDateString());
        $dateTo = $request->query('date_to', now()->endOfMonth()->toDateString());
        
        if ($dateFrom > $dateTo) {
            return [$dateTo . ' 00:00:00', $dateFrom . ' 23:59:59'];
        }
        return [$dateFrom . ' 00:00:00', $dateTo . ' 23:59:59'];
    }

    private function applyFilters($query, Request $request, $customDateRange = null)
    {
        [$dateFrom, $dateTo] = $customDateRange ?? $this->getDateRange($request);
        
        $branchId = $request->query('branch_id');
        $warehouseId = $request->query('warehouse_id');
        $employeeId = $request->query('employee_id');

        $query->whereBetween('invoices.invoice_date', [$dateFrom, $dateTo]);

        if ($branchId) {
            $query->where('invoices.branch_id', $branchId);
        }
        if ($warehouseId) {
            $query->where('invoices.warehouse_id', $warehouseId);
        }
        if ($employeeId) {
            $query->where('invoices.salesperson_id', $employeeId);
        }

        return $query;
    }

    public function getDashboardKPIs(Request $request): JsonResponse
    {
        $query = InvoiceModel::query()->where('invoices.tenant_id', $this->getTenantId($request))->where('invoices.status', '!=', 'cancelled');
        $query = $this->applyFilters($query, $request);

        $todayQuery = InvoiceModel::whereDate('invoices.invoice_date', now()->toDateString())
            ->where('invoices.tenant_id', $this->getTenantId($request))
            ->where('invoices.status', '!=', 'cancelled');

        [$dateFrom, $dateTo] = $this->getDateRange($request);
        $returnsQuery = SalesReturnModel::query()->where('tenant_id', $this->getTenantId($request))->whereBetween('return_date', [
            $dateFrom,
            $dateTo,
        ]);

        $metrics = (clone $query)->select(
            DB::raw('COALESCE(SUM(subtotal), 0) as gross_sales'),
            DB::raw('COALESCE(SUM(subtotal - discount_amount), 0) as net_sales'),
            DB::raw('COALESCE(SUM(discount_amount), 0) as discounts'),
            DB::raw('COALESCE(SUM(vat_amount), 0) as vat'),
            DB::raw('COALESCE(SUM(total - paid_amount), 0) as unpaid_invoices'),
            DB::raw('COUNT(id) as invoice_count')
        )->first();

        $cogs = (clone $query)->join('invoice_items', 'invoices.id', '=', 'invoice_items.invoice_id')
            ->sum(DB::raw('invoice_items.cost_price * invoice_items.quantity'));

        $netProfit = $metrics->net_sales - $cogs;

        // Previous Period calculations
        $diff = \Carbon\Carbon::parse($dateFrom)->diffInDays(\Carbon\Carbon::parse($dateTo));
        $prevDateFrom = \Carbon\Carbon::parse($dateFrom)->subDays($diff + 1)->format('Y-m-d 00:00:00');
        $prevDateTo = \Carbon\Carbon::parse($dateFrom)->subDays(1)->format('Y-m-d 23:59:59');

        $prevQuery = InvoiceModel::query()->where('invoices.tenant_id', $this->getTenantId($request))->where('invoices.status', '!=', 'cancelled');
        $prevQuery = $this->applyFilters($prevQuery, $request, [$prevDateFrom, $prevDateTo]);
        
        $prevMetrics = clone $prevQuery->select(DB::raw('COALESCE(SUM(subtotal), 0) as gross_sales'), DB::raw('COALESCE(SUM(subtotal - discount_amount), 0) as net_sales'))->first();
        $prevCogs = (clone $prevQuery)->join('invoice_items', 'invoices.id', '=', 'invoice_items.invoice_id')->sum(DB::raw('invoice_items.cost_price * invoice_items.quantity'));
        $prevNetProfit = $prevMetrics->net_sales - $prevCogs;

        $salesTarget = $prevMetrics->net_sales > 0 ? $prevMetrics->net_sales * 1.1 : 10000;
        $aov = $metrics->invoice_count > 0 ? $metrics->net_sales / $metrics->invoice_count : 0;

        $kpis = [
            'today_sales' => (float) (clone $todayQuery)->sum(DB::raw('subtotal - discount_amount')),
            'gross_sales' => (float) $metrics->gross_sales,
            'net_sales' => (float) $metrics->net_sales,
            'net_profit' => (float) $netProfit,
            'average_order_value' => (float) $aov,
            'sales_target' => (float) $salesTarget,
            'discounts' => (float) $metrics->discounts,
            'vat' => (float) $metrics->vat,
            'unpaid_invoices' => (float) $metrics->unpaid_invoices,
            'returns' => (float) $returnsQuery->sum('subtotal'),
            'trends' => [
                'gross_sales' => $this->calculateTrend((float) $metrics->gross_sales, (float) $prevMetrics->gross_sales),
                'net_sales' => $this->calculateTrend((float) $metrics->net_sales, (float) $prevMetrics->net_sales),
                'net_profit' => $this->calculateTrend((float) $netProfit, (float) $prevNetProfit),
            ]
        ];

        return $this->success($kpis, 'Dashboard KPIs retrieved successfully');
    }

    private function calculateTrend($current, $previous)
    {
        if ($previous == 0) return $current > 0 ? 100 : 0;
        return round((($current - $previous) / $previous) * 100, 6);
    }

    public function getDashboardCharts(Request $request): JsonResponse
    {
        $query = InvoiceModel::query()->where('invoices.tenant_id', $this->getTenantId($request))->where('invoices.status', '!=', 'cancelled');
        $query = $this->applyFilters($query, $request);

        $salesTrendBase = (clone $query)
            ->select(DB::raw('DATE(invoice_date) as date'), DB::raw('SUM(subtotal - discount_amount) as total'))
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $cogsTrend = (clone $query)
            ->join('invoice_items', 'invoices.id', '=', 'invoice_items.invoice_id')
            ->select(DB::raw('DATE(invoices.invoice_date) as date'), DB::raw('SUM(invoice_items.cost_price * invoice_items.quantity) as total_cost'))
            ->groupBy('date')
            ->pluck('total_cost', 'date');

        $salesTrend = $salesTrendBase->map(function($item) use ($cogsTrend) {
            $cost = $cogsTrend[$item->date] ?? 0;
            $profit = $item->total - $cost;
            $margin = $item->total > 0 ? round(($profit / $item->total) * 100, 6) : 0;
            return [
                'date' => $item->date,
                'total' => (float) $item->total,
                'profit_margin' => (float) $margin
            ];
        });

        $paymentMethods = (clone $query)
            ->whereNotNull('payment_method')
            ->select('payment_method as type', DB::raw('SUM(subtotal - discount_amount) as total'))
            ->groupBy('payment_method')
            ->get()
            ->map(fn($item) => ['type' => $item->type, 'total' => (float) $item->total]);

        $salesChannels = (clone $query)
            ->whereNotNull('sales_channel_name')
            ->select('sales_channel_name', DB::raw('SUM(subtotal - discount_amount) as total'))
            ->groupBy('sales_channel_name')
            ->get()
            ->map(fn($item) => ['sales_channel_name' => $item->sales_channel_name, 'total' => (float) $item->total]);

        $topProducts = (clone $query)
            ->join('invoice_items', 'invoices.id', '=', 'invoice_items.invoice_id')
            ->join('products', 'invoice_items.product_id', '=', 'products.id')
            ->select('products.name', 'products.name_ar', DB::raw('SUM(invoice_items.quantity) as total_quantity'), DB::raw('SUM(invoice_items.total) as total_revenue'))
            ->groupBy('products.id', 'products.name', 'products.name_ar')
            ->orderByDesc('total_revenue')
            ->limit(5)
            ->get()
            ->map(fn($item) => ['name' => $item->name, 'name_ar' => $item->name_ar, 'total_quantity' => (float) $item->total_quantity, 'total_revenue' => (float) $item->total_revenue]);

        $topCustomers = (clone $query)
            ->join('customers', 'invoices.customer_id', '=', 'customers.id')
            ->select('customers.name', DB::raw('SUM(invoices.subtotal - invoices.discount_amount) as total_revenue'))
            ->groupBy('customers.id', 'customers.name')
            ->orderByDesc('total_revenue')
            ->limit(5)
            ->get()
            ->map(fn($item) => ['name' => $item->name, 'total_revenue' => (float) $item->total_revenue]);

        $recentInvoices = (clone $query)
            ->leftJoin('customers', 'invoices.customer_id', '=', 'customers.id')
            ->select('invoices.id', 'invoices.invoice_number', 'customers.name as customer_name', 'invoices.total', 'invoices.status', 'invoices.payment_status', 'invoices.invoice_date')
            ->orderByDesc('invoices.invoice_date')
            ->limit(5)
            ->get();

        $salesByBranch = (clone $query)
            ->leftJoin('branches', 'invoices.branch_id', '=', 'branches.id')
            ->select('branches.name as branch_name', DB::raw('SUM(invoices.subtotal - invoices.discount_amount) as total'))
            ->whereNotNull('invoices.branch_id')
            ->groupBy('invoices.branch_id', 'branches.name')
            ->get()
            ->map(fn($item) => ['branch_name' => $item->branch_name ?? 'بدون فرع', 'total' => (float) $item->total]);

        $topSalesReps = (clone $query)
            ->leftJoin('users', 'invoices.salesperson_id', '=', 'users.id')
            ->select('users.name as rep_name', DB::raw('SUM(invoices.subtotal - invoices.discount_amount) as total'))
            ->whereNotNull('invoices.salesperson_id')
            ->groupBy('invoices.salesperson_id', 'users.name')
            ->orderByDesc('total')
            ->limit(5)
            ->get()
            ->map(fn($item) => ['rep_name' => $item->rep_name ?? 'بدون مندوب', 'total' => (float) $item->total]);

        $customerCounts = (clone $query)
            ->select('customer_id', DB::raw('COUNT(id) as order_count'), DB::raw('SUM(subtotal - discount_amount) as total'))
            ->groupBy('customer_id')
            ->get();
            
        $newCustomersTotal = $customerCounts->where('order_count', 1)->sum('total');
        $returningCustomersTotal = $customerCounts->where('order_count', '>', 1)->sum('total');

        $customerRetention = [
            ['type' => 'عملاء جدد (طلب واحد)', 'total' => (float) $newCustomersTotal],
            ['type' => 'عملاء دائمين (أكثر من طلب)', 'total' => (float) $returningCustomersTotal],
        ];

        $charts = [
            'sales_trend' => $salesTrend,
            'payment_methods' => $paymentMethods,
            'sales_channels' => $salesChannels,
            'top_products' => $topProducts,
            'top_customers' => $topCustomers,
            'recent_invoices' => $recentInvoices,
            'sales_by_branch' => $salesByBranch,
            'top_sales_reps' => $topSalesReps,
            'customer_retention' => $customerRetention,
        ];

        return $this->success($charts, 'Dashboard charts retrieved successfully');
    }
}
