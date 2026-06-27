<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Accounting;

use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AgingReportController extends BaseTenantController
{
    private const BUCKETS = [
        'current'  => [0, 0],
        '1_30'     => [1, 30],
        '31_60'    => [31, 60],
        '61_90'    => [61, 90],
        'over_90'  => [91, PHP_INT_MAX],
    ];

    /**
     * Accounts Receivable aging — كشف المدينين التفصيلي
     */
    public function receivable(Request $request): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $asOf     = $request->query('as_of', now()->toDateString());

        $invoices = DB::connection('tenant')
            ->table('invoices')
            ->join('customers', 'customers.id', '=', 'invoices.customer_id')
            ->where('invoices.tenant_id', $tenantId)
            ->where('invoices.status', 'confirmed')
            ->whereIn('invoices.payment_status', ['unpaid', 'partial'])
            ->whereNull('invoices.deleted_at')
            ->select([
                'invoices.id',
                'invoices.invoice_number',
                'invoices.invoice_date',
                'invoices.due_date',
                'invoices.total',
                'invoices.paid_amount',
                DB::raw('(invoices.total - COALESCE(invoices.paid_amount,0)) as outstanding'),
                'customers.id as customer_id',
                'customers.name as customer_name',
                'customers.phone as customer_phone',
            ])
            ->get();

        $rows     = [];
        $totals   = array_fill_keys(array_keys(self::BUCKETS), 0.0);
        $totals['total'] = 0.0;

        foreach ($invoices as $inv) {
            $dueDate    = $inv->due_date ? \Carbon\Carbon::parse($inv->due_date) : \Carbon\Carbon::parse($inv->invoice_date)->addDays(30);
            $daysOverdue = (int) \Carbon\Carbon::parse($asOf)->diffInDays($dueDate, false) * -1;
            $daysOverdue = max(0, $daysOverdue);
            $outstanding = (float) $inv->outstanding;

            $bucket = $this->getBucket($daysOverdue);

            $totals[$bucket] += $outstanding;
            $totals['total'] += $outstanding;

            $rows[] = [
                'invoice_id'     => $inv->id,
                'invoice_number' => $inv->invoice_number,
                'invoice_date'   => $inv->invoice_date,
                'due_date'       => $inv->due_date,
                'days_overdue'   => $daysOverdue,
                'customer_id'    => $inv->customer_id,
                'customer_name'  => $inv->customer_name,
                'customer_phone' => $inv->customer_phone,
                'total'          => (float) $inv->total,
                'paid'           => (float) $inv->paid_amount,
                'outstanding'    => $outstanding,
                'bucket'         => $bucket,
            ];
        }

        // Group by customer for summary
        $byCustomer = collect($rows)->groupBy('customer_id')->map(function ($items, $customerId) {
            $first    = $items->first();
            $buckets  = array_fill_keys(array_keys(self::BUCKETS), 0.0);
            foreach ($items as $item) {
                $buckets[$item['bucket']] += $item['outstanding'];
            }
            return array_merge([
                'customer_id'   => $customerId,
                'customer_name' => $first['customer_name'],
                'invoices'      => $items->count(),
                'total'         => $items->sum('outstanding'),
            ], $buckets);
        })->values();

        return $this->success([
            'as_of'       => $asOf,
            'type'        => 'receivable',
            'by_invoice'  => $rows,
            'by_customer' => $byCustomer,
            'totals'      => array_map(fn($v) => round($v, 2), $totals),
        ]);
    }

    /**
     * Accounts Payable aging — كشف الدائنين التفصيلي
     */
    public function payable(Request $request): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $asOf     = $request->query('as_of', now()->toDateString());

        $purchases = DB::connection('tenant')
            ->table('purchases')
            ->join('suppliers', 'suppliers.id', '=', 'purchases.supplier_id')
            ->where('purchases.tenant_id', $tenantId)
            ->where('purchases.status', 'confirmed')
            ->whereIn('purchases.payment_status', ['unpaid', 'partial'])
            ->whereNull('purchases.deleted_at')
            ->select([
                'purchases.id',
                'purchases.purchase_number',
                'purchases.purchase_date',
                'purchases.due_date',
                'purchases.total',
                'purchases.paid_amount',
                DB::raw('(purchases.total - COALESCE(purchases.paid_amount,0)) as outstanding'),
                'suppliers.id as supplier_id',
                'suppliers.name as supplier_name',
                'suppliers.phone as supplier_phone',
            ])
            ->get();

        $rows   = [];
        $totals = array_fill_keys(array_keys(self::BUCKETS), 0.0);
        $totals['total'] = 0.0;

        foreach ($purchases as $po) {
            $dueDate     = $po->due_date ? \Carbon\Carbon::parse($po->due_date) : \Carbon\Carbon::parse($po->purchase_date)->addDays(30);
            $daysOverdue = (int) \Carbon\Carbon::parse($asOf)->diffInDays($dueDate, false) * -1;
            $daysOverdue = max(0, $daysOverdue);
            $outstanding = (float) $po->outstanding;

            $bucket = $this->getBucket($daysOverdue);

            $totals[$bucket] += $outstanding;
            $totals['total'] += $outstanding;

            $rows[] = [
                'purchase_id'    => $po->id,
                'purchase_number'=> $po->purchase_number,
                'purchase_date'  => $po->purchase_date,
                'due_date'       => $po->due_date,
                'days_overdue'   => $daysOverdue,
                'supplier_id'    => $po->supplier_id,
                'supplier_name'  => $po->supplier_name,
                'supplier_phone' => $po->supplier_phone,
                'total'          => (float) $po->total,
                'paid'           => (float) $po->paid_amount,
                'outstanding'    => $outstanding,
                'bucket'         => $bucket,
            ];
        }

        $bySupplier = collect($rows)->groupBy('supplier_id')->map(function ($items, $supplierId) {
            $first   = $items->first();
            $buckets = array_fill_keys(array_keys(self::BUCKETS), 0.0);
            foreach ($items as $item) {
                $buckets[$item['bucket']] += $item['outstanding'];
            }
            return array_merge([
                'supplier_id'   => $supplierId,
                'supplier_name' => $first['supplier_name'],
                'invoices'      => $items->count(),
                'total'         => $items->sum('outstanding'),
            ], $buckets);
        })->values();

        return $this->success([
            'as_of'       => $asOf,
            'type'        => 'payable',
            'by_invoice'  => $rows,
            'by_supplier' => $bySupplier,
            'totals'      => array_map(fn($v) => round($v, 2), $totals),
        ]);
    }

    private function getBucket(int $days): string
    {
        if ($days === 0) return 'current';
        if ($days <= 30) return '1_30';
        if ($days <= 60) return '31_60';
        if ($days <= 90) return '61_90';
        return 'over_90';
    }
}
