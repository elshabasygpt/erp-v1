<?php

declare(strict_types=1);

namespace App\Application\Reporting\Queries\Sales;

use App\Infrastructure\Eloquent\Models\InvoiceModel;
use Illuminate\Support\Facades\DB;

class GetAdvancedSalesChartsQuery
{
    public function execute(SalesReportFilters $filters): array
    {
        $query = InvoiceModel::query()
            ->where('invoices.tenant_id', $filters->tenantId)
            ->where('invoices.status', '!=', 'cancelled');
        $query = $this->applyFilters($query, $filters);

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
            ->select('type', DB::raw('SUM(subtotal - discount_amount) as total'))
            ->groupBy('type')
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
            ->select('customer_id', DB::raw('COUNT(invoices.id) as order_count'), DB::raw('SUM(subtotal - discount_amount) as total'))
            ->groupBy('customer_id')
            ->get();
            
        $newCustomersTotal = $customerCounts->where('order_count', 1)->sum('total');
        $returningCustomersTotal = $customerCounts->where('order_count', '>', 1)->sum('total');

        $customerRetention = [
            ['type' => 'عملاء جدد (طلب واحد)', 'total' => (float) $newCustomersTotal],
            ['type' => 'عملاء دائمين (أكثر من طلب)', 'total' => (float) $returningCustomersTotal],
        ];

        return [
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
    }

    private function applyFilters($query, SalesReportFilters $filters)
    {
        $query->whereBetween('invoices.invoice_date', [$filters->dateFrom, $filters->dateTo]);

        if ($filters->branchId) {
            $query->where('invoices.branch_id', $filters->branchId);
        }
        if ($filters->warehouseId) {
            $query->where('invoices.warehouse_id', $filters->warehouseId);
        }
        if ($filters->employeeId) {
            $query->where('invoices.salesperson_id', $filters->employeeId);
        }

        return $query;
    }
}
