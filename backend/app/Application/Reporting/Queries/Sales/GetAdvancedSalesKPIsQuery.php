<?php

declare(strict_types=1);

namespace App\Application\Reporting\Queries\Sales;

use App\Infrastructure\Eloquent\Models\InvoiceModel;
use App\Infrastructure\Eloquent\Models\SalesReturnModel;
use Illuminate\Support\Facades\DB;

class GetAdvancedSalesKPIsQuery
{
    public function execute(SalesReportFilters $filters): array
    {
        $query = InvoiceModel::query()
            ->where('invoices.tenant_id', $filters->tenantId)
            ->where('invoices.status', '!=', 'cancelled');
        $query = $this->applyFilters($query, $filters);

        $todayQuery = InvoiceModel::whereDate('invoices.invoice_date', now()->toDateString())
            ->where('invoices.tenant_id', $filters->tenantId)
            ->where('invoices.status', '!=', 'cancelled');

        $returnsQuery = SalesReturnModel::query()
            ->where('tenant_id', $filters->tenantId)
            ->whereBetween('return_date', [
                $filters->dateFrom,
                $filters->dateTo,
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
        $diff = \Carbon\Carbon::parse($filters->dateFrom)->diffInDays(\Carbon\Carbon::parse($filters->dateTo));
        $prevDateFrom = \Carbon\Carbon::parse($filters->dateFrom)->subDays($diff + 1)->format('Y-m-d 00:00:00');
        $prevDateTo = \Carbon\Carbon::parse($filters->dateFrom)->subDays(1)->format('Y-m-d 23:59:59');

        $prevFilters = new SalesReportFilters(
            tenantId: $filters->tenantId,
            dateFrom: $prevDateFrom,
            dateTo: $prevDateTo,
            branchId: $filters->branchId,
            warehouseId: $filters->warehouseId,
            employeeId: $filters->employeeId
        );

        $prevQuery = InvoiceModel::query()
            ->where('invoices.tenant_id', $prevFilters->tenantId)
            ->where('invoices.status', '!=', 'cancelled');
        $prevQuery = $this->applyFilters($prevQuery, $prevFilters);
        
        $prevMetrics = clone $prevQuery->select(DB::raw('COALESCE(SUM(subtotal), 0) as gross_sales'), DB::raw('COALESCE(SUM(subtotal - discount_amount), 0) as net_sales'))->first();
        $prevCogs = (clone $prevQuery)->join('invoice_items', 'invoices.id', '=', 'invoice_items.invoice_id')->sum(DB::raw('invoice_items.cost_price * invoice_items.quantity'));
        $prevNetProfit = $prevMetrics->net_sales - $prevCogs;

        $salesTarget = $prevMetrics->net_sales > 0 ? $prevMetrics->net_sales * 1.1 : 10000;
        $aov = $metrics->invoice_count > 0 ? $metrics->net_sales / $metrics->invoice_count : 0;

        return [
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

    private function calculateTrend($current, $previous)
    {
        if ($previous == 0) return $current > 0 ? 100 : 0;
        return round((($current - $previous) / $previous) * 100, 6);
    }
}
