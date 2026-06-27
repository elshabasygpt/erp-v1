<?php

declare(strict_types=1);

namespace App\Application\Purchases\UseCases;

use Illuminate\Support\Facades\DB;

class GetSupplierStatementUseCase
{
    public function execute(string $tenantId, string $supplierId, ?string $fromDate = null, ?string $toDate = null): array
    {
        $toDate = $toDate ?? now()->toDateString();

        // Opening balance (what we owed supplier) before fromDate
        $openingBalance = 0.0;
        if ($fromDate) {
            $ob = DB::connection('tenant')->table('purchase_invoices')
                ->where('tenant_id', $tenantId)
                ->where('supplier_id', $supplierId)
                ->where('status', 'confirmed')
                ->whereDate('invoice_date', '<', $fromDate)
                ->selectRaw('COALESCE(SUM(total),0) as total, COALESCE(SUM(paid_amount),0) as paid')
                ->first();
            $openingBalance = (float)$ob->total - (float)$ob->paid;
        }

        // Purchases in period (we owe supplier → credit)
        $purQ = DB::connection('tenant')->table('purchase_invoices')
            ->where('tenant_id', $tenantId)
            ->where('supplier_id', $supplierId)
            ->where('status', 'confirmed')
            ->select([
                'id',
                'invoice_date as date',
                DB::raw("'purchase' as type"),
                'invoice_number as reference',
                DB::raw('0 as debit'),
                'total as credit',
                'notes as description',
            ]);
        if ($fromDate) $purQ->whereDate('invoice_date', '>=', $fromDate);
        $purQ->whereDate('invoice_date', '<=', $toDate);

        // Supplier payments in period (we paid → debit)
        $payQ = DB::connection('tenant')->table('supplier_payments')
            ->where('supplier_id', $supplierId)
            ->select([
                'id',
                'payment_date as date',
                DB::raw("'payment' as type"),
                'reference as reference',
                'amount as debit',
                DB::raw('0 as credit'),
                'notes as description',
            ]);
        if ($fromDate) $payQ->whereDate('payment_date', '>=', $fromDate);
        $payQ->whereDate('payment_date', '<=', $toDate);

        // Supplier credit notes applied (reduces our payable → debit)
        $cnQ = DB::connection('tenant')->table('credit_notes')
            ->where('supplier_id', $supplierId)
            ->where('type', 'supplier')
            ->whereIn('status', ['applied', 'refunded'])
            ->select([
                'id',
                'issue_date as date',
                DB::raw("'credit_note' as type"),
                'credit_note_number as reference',
                'total as debit',
                DB::raw('0 as credit'),
                DB::raw("'Supplier Credit Note' as description"),
            ]);
        if ($fromDate) $cnQ->whereDate('issue_date', '>=', $fromDate);
        $cnQ->whereDate('issue_date', '<=', $toDate);

        // Purchase returns (reduces our payable → debit)
        $retQ = DB::connection('tenant')->table('purchase_returns')
            ->where('supplier_id', $supplierId)
            ->select([
                'id',
                'issue_date as date',
                DB::raw("'return' as type"),
                'number as reference',
                'total_amount as debit',
                DB::raw('0 as credit'),
                'notes as description',
            ]);
        if ($fromDate) $retQ->whereDate('issue_date', '>=', $fromDate);
        $retQ->whereDate('issue_date', '<=', $toDate);

        $transactions = $purQ->union($payQ)->union($cnQ)->union($retQ)
            ->orderBy('date')
            ->get();

        $balance = $openingBalance;
        $result  = [];
        foreach ($transactions as $t) {
            $balance += (float)$t->credit - (float)$t->debit;
            $result[] = [
                'id'              => $t->id,
                'date'            => $t->date,
                'type'            => $t->type,
                'reference'       => $t->reference,
                'description'     => $t->description,
                'debit'           => round((float)$t->debit, 2),
                'credit'          => round((float)$t->credit, 2),
                'running_balance' => round($balance, 2),
            ];
        }

        return [
            'opening_balance' => round($openingBalance, 2),
            'closing_balance' => round($balance, 2),
            'transactions'    => $result,
        ];
    }
}
