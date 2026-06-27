<?php

declare(strict_types=1);

namespace App\Application\Sales\UseCases;

use Illuminate\Support\Facades\DB;

class GetCustomerStatementUseCase
{
    public function execute(string $tenantId, string $customerId, ?string $fromDate = null, ?string $toDate = null): array
    {
        $toDate ??= now()->toDateString();

        // Opening balance before fromDate
        $openingBalance = 0.0;
        if ($fromDate) {
            $ob = DB::connection('tenant')->table('invoices')
                ->where('tenant_id', $tenantId)
                ->where('customer_id', $customerId)
                ->where('status', 'confirmed')
                ->whereDate('invoice_date', '<', $fromDate)
                ->selectRaw('COALESCE(SUM(total),0) as total, COALESCE(SUM(paid_amount),0) as paid')
                ->first();
            $openingBalance = (float)$ob->total - (float)$ob->paid;

            // Subtract applied credit notes before fromDate
            $cnBefore = DB::connection('tenant')->table('credit_notes')
                ->where('customer_id', $customerId)
                ->where('type', 'customer')
                ->whereIn('status', ['applied', 'refunded'])
                ->whereDate('issue_date', '<', $fromDate)
                ->selectRaw('COALESCE(SUM(total),0) as applied')
                ->value('applied') ?? 0;
            $openingBalance -= (float)$cnBefore;

            // Subtract sales returns before fromDate
            $retBefore = DB::connection('tenant')->table('sales_returns')
                ->where('customer_id', $customerId)
                ->whereDate('return_date', '<', $fromDate)
                ->selectRaw('COALESCE(SUM(total),0) as total')
                ->value('total') ?? 0;
            $openingBalance -= (float)$retBefore;
        }

        // Invoices in period
        $invQ = DB::connection('tenant')->table('invoices')
            ->where('tenant_id', $tenantId)
            ->where('customer_id', $customerId)
            ->where('status', 'confirmed')
            ->select([
                'id',
                'invoice_date as date',
                DB::raw("'invoice' as type"),
                'invoice_number as reference',
                'total as debit',
                DB::raw('0 as credit'),
                'notes as description',
            ]);
        if ($fromDate) $invQ->whereDate('invoice_date', '>=', $fromDate);
        $invQ->whereDate('invoice_date', '<=', $toDate);

        // Payments in period
        $payQ = DB::connection('tenant')->table('customer_payments')
            ->where('customer_id', $customerId)
            ->where('status', 'completed')
            ->select([
                'id',
                'payment_date as date',
                DB::raw("'payment' as type"),
                'reference_number as reference',
                DB::raw('0 as debit'),
                'amount as credit',
                'notes as description',
            ]);
        if ($fromDate) $payQ->whereDate('payment_date', '>=', $fromDate);
        $payQ->whereDate('payment_date', '<=', $toDate);

        // Credit Notes applied in period
        $cnQ = DB::connection('tenant')->table('credit_notes')
            ->where('customer_id', $customerId)
            ->where('type', 'customer')
            ->whereIn('status', ['applied', 'refunded'])
            ->select([
                'id',
                'issue_date as date',
                DB::raw("'credit_note' as type"),
                'credit_note_number as reference',
                DB::raw('0 as debit'),
                'total as credit',
                DB::raw("'Credit Note Applied' as description"),
            ]);
        if ($fromDate) $cnQ->whereDate('issue_date', '>=', $fromDate);
        $cnQ->whereDate('issue_date', '<=', $toDate);

        // Sales Returns in period
        $retQ = DB::connection('tenant')->table('sales_returns')
            ->where('customer_id', $customerId)
            ->select([
                'id',
                'return_date as date',
                DB::raw("'return' as type"),
                'return_number as reference',
                DB::raw('0 as debit'),
                'total as credit',
                'notes as description',
            ]);
        if ($fromDate) $retQ->whereDate('return_date', '>=', $fromDate);
        $retQ->whereDate('return_date', '<=', $toDate);

        $transactions = $invQ->union($payQ)->union($cnQ)->union($retQ)
            ->orderBy('date')
            ->get();

        $balance = $openingBalance;
        $result  = [];
        foreach ($transactions as $t) {
            $balance += (float)$t->debit - (float)$t->credit;
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
