<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Sales;

use App\Presentation\Controllers\API\BaseTenantController;
use App\Infrastructure\Eloquent\Models\InvoiceModel;
use App\Infrastructure\Eloquent\Models\SalesReturnModel;
use App\Infrastructure\Eloquent\Models\InvoiceItemModel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AdvancedSalesReportController extends BaseTenantController
{
    private function applyFilters($query, Request $request)
    {
        $dateFrom = $request->query('date_from', now()->startOfMonth()->toDateString());
        $dateTo = $request->query('date_to', now()->endOfMonth()->toDateString());
        $branchId = $request->query('branch_id');
        $warehouseId = $request->query('warehouse_id');
        $employeeId = $request->query('employee_id');

        $query->whereBetween('invoice_date', [$dateFrom, $dateTo]);
        
        if ($branchId) $query->where('branch_id', $branchId);
        if ($warehouseId) $query->where('warehouse_id', $warehouseId);
        if ($employeeId) $query->where('salesperson_id', $employeeId);

        return $query;
    }

    public function getDashboardKPIs(Request $request): JsonResponse
    {
        $query = InvoiceModel::where('tenant_id', $this->getTenantId($request))->where('status', '!=', 'cancelled');
        $query = $this->applyFilters($query, $request);
            
        $todayQuery = InvoiceModel::whereDate('invoice_date', now()->toDateString())
            ->where('status', '!=', 'cancelled');

        $returnsQuery = SalesReturnModel::where('tenant_id', $this->getTenantId($request))->whereBetween('return_date', [
            $request->query('date_from', now()->startOfMonth()->toDateString()),
            $request->query('date_to', now()->endOfMonth()->toDateString())
        ]);

        $metrics = (clone $query)->select(
            DB::raw('COALESCE(SUM(subtotal), 0) as gross_sales'),
            DB::raw('COALESCE(SUM(subtotal - discount_amount), 0) as net_sales'),
            DB::raw('COALESCE(SUM(discount_amount), 0) as discounts'),
            DB::raw('COALESCE(SUM(vat_amount), 0) as vat'),
            DB::raw('COALESCE(SUM(total - paid_amount), 0) as unpaid_invoices')
        )->first();

        $kpis = [
            'today_sales' => (float) (clone $todayQuery)->sum(DB::raw('subtotal - discount_amount')),
            'gross_sales' => (float) $metrics->gross_sales,
            'net_sales' => (float) $metrics->net_sales,
            'discounts' => (float) $metrics->discounts,
            'vat' => (float) $metrics->vat,
            'unpaid_invoices' => (float) $metrics->unpaid_invoices,
            'returns' => (float) $returnsQuery->sum('subtotal'),
        ];

        return $this->success($kpis, 'Dashboard KPIs retrieved successfully');
    }

    public function getDashboardCharts(Request $request): JsonResponse
    {
        $query = InvoiceModel::where('tenant_id', $this->getTenantId($request))->where('status', '!=', 'cancelled');
        $query = $this->applyFilters($query, $request);

        $salesTrend = (clone $query)
            ->select(DB::raw('CAST(invoice_date AS DATE) as date'), DB::raw('SUM(subtotal - discount_amount) as total'))
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $paymentMethods = (clone $query)
            ->select('type', DB::raw('SUM(subtotal - discount_amount) as total'))
            ->groupBy('type')
            ->get();
            
        $salesChannels = (clone $query)
            ->whereNotNull('sales_channel_name')
            ->select('sales_channel_name', DB::raw('SUM(subtotal - discount_amount) as total'))
            ->groupBy('sales_channel_name')
            ->get();

        $charts = [
            'sales_trend' => $salesTrend,
            'payment_methods' => $paymentMethods,
            'sales_channels' => $salesChannels,
        ];

        return $this->success($charts, 'Dashboard charts retrieved successfully');
    }
}


