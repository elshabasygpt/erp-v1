<?php

declare(strict_types=1);

namespace App\Application\Sales\UseCases;

use Illuminate\Support\Facades\DB;

class GetCustomerStatementUseCase
{
    public function execute(string $customerId, ?string $fromDate = null, ?string $toDate = null): array
    {
        // Get all credit invoices
        $invoicesQuery = DB::table('invoices')
            ->select([
                'id',
                'invoice_date as date',
                DB::raw("'invoice' as type"),
                'invoice_number as reference',
                'total as debit',
                DB::raw("0 as credit"),
                'notes as description'
            ])
            ->where('customer_id', $customerId)
            ->where('type', 'credit')
            ->where('status', 'confirmed');

        if ($fromDate) $invoicesQuery->whereDate('invoice_date', '>=', $fromDate);
        if ($toDate) $invoicesQuery->whereDate('invoice_date', '<=', $toDate);

        // Get all payments
        $paymentsQuery = DB::table('customer_payments')
            ->select([
                'id',
                'payment_date as date',
                DB::raw("'payment' as type"),
                'reference_number as reference',
                DB::raw("0 as debit"),
                'amount as credit',
                'notes as description'
            ])
            ->where('customer_id', $customerId)
            ->where('status', 'completed');

        if ($fromDate) $paymentsQuery->whereDate('payment_date', '>=', $fromDate);
        if ($toDate) $paymentsQuery->whereDate('payment_date', '<=', $toDate);

        $unionQuery = $invoicesQuery->union($paymentsQuery)->orderBy('date');

        $transactions = $unionQuery->get();

        // Calculate running balance
        $balance = 0;
        foreach ($transactions as $t) {
            $balance += $t->debit - $t->credit;
            $t->running_balance = $balance;
        }

        return $transactions->toArray();
    }
}
