<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Accounting;

use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * FinancialReportsController
 *
 * All missing accounting reports in one place:
 *  - Customer Statement
 *  - Supplier Statement
 *  - Account Statement (with running balance)
 *  - Fixed Asset Register
 *  - Monthly P&L
 *  - VAT Detail Report
 *  - Bank Position Report
 *  - Expense Analysis
 *  - Combined Depreciation Schedule
 *  - Budget Utilization Summary
 */
class FinancialReportsController extends BaseTenantController
{
    // =========================================================
    // R1 — Customer Statement  كشف حساب العميل
    // =========================================================
    public function customerStatement(Request $request): JsonResponse
    {
        $request->validate([
            'customer_id' => 'required|uuid',
            'from'        => 'nullable|date',
            'to'          => 'nullable|date|after_or_equal:from',
        ]);

        $tenantId   = (string) $this->getTenantId($request);
        $customerId = $request->get('customer_id');
        $from       = $request->get('from');
        $to         = $request->get('to', now()->toDateString());

        // Opening balance = all debits - credits BEFORE the 'from' date
        $openingBalance = 0.0;
        if ($from) {
            $ob = DB::connection('tenant')->table('invoices')
                ->where('tenant_id', $tenantId)
                ->where('customer_id', $customerId)
                ->where('status', 'confirmed')
                ->whereDate('invoice_date', '<', $from)
                ->selectRaw('COALESCE(SUM(total),0) as total, COALESCE(SUM(paid_amount),0) as paid')
                ->first();
            $openingBalance = (float)$ob->total - (float)$ob->paid;

            $obCN = DB::connection('tenant')->table('credit_notes')
                ->where('customer_id', $customerId)
                ->where('type', 'customer')
                ->whereIn('status', ['applied', 'refunded'])
                ->whereDate('issue_date', '<', $from)
                ->selectRaw('COALESCE(SUM(total),0) as applied')
                ->value('applied') ?? 0;
            $openingBalance -= (float)$obCN;

            $obRet = DB::connection('tenant')->table('sales_returns')
                ->where('customer_id', $customerId)
                ->whereDate('return_date', '<', $from)
                ->selectRaw('COALESCE(SUM(total),0) as total')
                ->value('total') ?? 0;
            $openingBalance -= (float)$obRet;
        }

        // Invoices in period
        $invQ = DB::connection('tenant')->table('invoices')
            ->where('tenant_id', $tenantId)
            ->where('customer_id', $customerId)
            ->where('status', 'confirmed')
            ->selectRaw("
                id,
                invoice_date   AS date,
                'invoice'      AS type,
                invoice_number AS reference,
                total          AS debit,
                0              AS credit,
                notes          AS description
            ");
        if ($from) $invQ->whereDate('invoice_date', '>=', $from);
        $invQ->whereDate('invoice_date', '<=', $to);

        // Payments in period
        $payQ = DB::connection('tenant')->table('customer_payments')
            ->where('customer_id', $customerId)
            ->where('status', 'completed')
            ->selectRaw("
                id,
                payment_date     AS date,
                'payment'        AS type,
                reference_number AS reference,
                0                AS debit,
                amount           AS credit,
                notes            AS description
            ");
        if ($from) $payQ->whereDate('payment_date', '>=', $from);
        $payQ->whereDate('payment_date', '<=', $to);

        // Credit Notes applied in period
        $cnQ = DB::connection('tenant')->table('credit_notes')
            ->where('customer_id', $customerId)
            ->where('type', 'customer')
            ->whereIn('status', ['applied', 'refunded'])
            ->selectRaw("
                id,
                issue_date         AS date,
                'credit_note'      AS type,
                credit_note_number AS reference,
                0                  AS debit,
                total              AS credit,
                'Credit Note Applied' AS description
            ");
        if ($from) $cnQ->whereDate('issue_date', '>=', $from);
        $cnQ->whereDate('issue_date', '<=', $to);

        // Sales Returns in period
        $retQ = DB::connection('tenant')->table('sales_returns')
            ->where('customer_id', $customerId)
            ->selectRaw("
                id,
                return_date   AS date,
                'return'      AS type,
                return_number AS reference,
                0             AS debit,
                total         AS credit,
                notes         AS description
            ");
        if ($from) $retQ->whereDate('return_date', '>=', $from);
        $retQ->whereDate('return_date', '<=', $to);

        $rows = $invQ->union($payQ)->union($cnQ)->union($retQ)
            ->orderBy('date')
            ->orderBy('type')
            ->get();

        // Running balance
        $balance = $openingBalance;
        $transactions = [];
        foreach ($rows as $row) {
            $balance += (float)$row->debit - (float)$row->credit;
            $transactions[] = [
                'id'              => $row->id,
                'date'            => $row->date,
                'type'            => $row->type,
                'reference'       => $row->reference,
                'description'     => $row->description,
                'debit'           => round((float)$row->debit, 2),
                'credit'          => round((float)$row->credit, 2),
                'running_balance' => round($balance, 2),
            ];
        }

        // Customer info
        $customer = DB::connection('tenant')->table('customers')
            ->where('id', $customerId)
            ->select('id', 'name', 'phone', 'email', 'address')
            ->first();

        return $this->success([
            'customer'        => $customer,
            'period'          => ['from' => $from, 'to' => $to],
            'opening_balance' => round($openingBalance, 2),
            'closing_balance' => round($balance, 2),
            'total_debit'     => round(collect($transactions)->sum('debit'), 2),
            'total_credit'    => round(collect($transactions)->sum('credit'), 2),
            'transactions'    => $transactions,
        ]);
    }

    // =========================================================
    // R2 — Supplier Statement  كشف حساب المورد
    // =========================================================
    public function supplierStatement(Request $request): JsonResponse
    {
        $request->validate([
            'supplier_id' => 'required|uuid',
            'from'        => 'nullable|date',
            'to'          => 'nullable|date|after_or_equal:from',
        ]);

        $tenantId   = (string) $this->getTenantId($request);
        $supplierId = $request->get('supplier_id');
        $from       = $request->get('from');
        $to         = $request->get('to', now()->toDateString());

        // Opening balance = outstanding purchases BEFORE from date
        $openingBalance = 0.0;
        if ($from) {
            $ob = DB::connection('tenant')->table('purchase_invoices')
                ->where('tenant_id', $tenantId)
                ->where('supplier_id', $supplierId)
                ->where('status', 'confirmed')
                ->whereDate('invoice_date', '<', $from)
                ->selectRaw('COALESCE(SUM(total),0) as total, COALESCE(SUM(paid_amount),0) as paid')
                ->first();
            $openingBalance = (float)$ob->total - (float)$ob->paid;
        }

        // Purchases in period (we owe supplier → credit)
        $purQ = DB::connection('tenant')->table('purchase_invoices')
            ->where('tenant_id', $tenantId)
            ->where('supplier_id', $supplierId)
            ->where('status', 'confirmed')
            ->selectRaw("
                id,
                invoice_date   AS date,
                'purchase'     AS type,
                invoice_number AS reference,
                0              AS debit,
                total          AS credit,
                notes          AS description
            ");
        if ($from) $purQ->whereDate('invoice_date', '>=', $from);
        $purQ->whereDate('invoice_date', '<=', $to);

        // Supplier payments in period (we paid → debit)
        $payQ = DB::connection('tenant')->table('supplier_payments')
            ->where('supplier_id', $supplierId)
            ->selectRaw("
                id,
                payment_date AS date,
                'payment'    AS type,
                reference    AS reference,
                amount       AS debit,
                0            AS credit,
                notes        AS description
            ");
        if ($from) $payQ->whereDate('payment_date', '>=', $from);
        $payQ->whereDate('payment_date', '<=', $to);

        // Supplier Credit Notes (supplier gives us credit → debit our payable)
        $cnQ = DB::connection('tenant')->table('credit_notes')
            ->where('supplier_id', $supplierId)
            ->where('type', 'supplier')
            ->whereIn('status', ['applied', 'refunded'])
            ->selectRaw("
                id,
                issue_date         AS date,
                'credit_note'      AS type,
                credit_note_number AS reference,
                total              AS debit,
                0                  AS credit,
                'Supplier Credit Note' AS description
            ");
        if ($from) $cnQ->whereDate('issue_date', '>=', $from);
        $cnQ->whereDate('issue_date', '<=', $to);

        // Purchase Returns
        $retQ = DB::connection('tenant')->table('purchase_returns')
            ->where('supplier_id', $supplierId)
            ->selectRaw("
                id,
                issue_date    AS date,
                'return'      AS type,
                number        AS reference,
                total_amount  AS debit,
                0             AS credit,
                notes         AS description
            ");
        if ($from) $retQ->whereDate('issue_date', '>=', $from);
        $retQ->whereDate('issue_date', '<=', $to);

        $rows = $purQ->union($payQ)->union($cnQ)->union($retQ)
            ->orderBy('date')
            ->get();

        $balance = $openingBalance;
        $transactions = [];
        foreach ($rows as $row) {
            $balance += (float)$row->credit - (float)$row->debit;
            $transactions[] = [
                'id'              => $row->id,
                'date'            => $row->date,
                'type'            => $row->type,
                'reference'       => $row->reference,
                'description'     => $row->description,
                'debit'           => round((float)$row->debit, 2),
                'credit'          => round((float)$row->credit, 2),
                'running_balance' => round($balance, 2),
            ];
        }

        $supplier = DB::connection('tenant')->table('suppliers')
            ->where('id', $supplierId)
            ->select('id', 'name', 'phone', 'email', 'address')
            ->first();

        return $this->success([
            'supplier'        => $supplier,
            'period'          => ['from' => $from, 'to' => $to],
            'opening_balance' => round($openingBalance, 2),
            'closing_balance' => round($balance, 2),
            'total_debit'     => round(collect($transactions)->sum('debit'), 2),
            'total_credit'    => round(collect($transactions)->sum('credit'), 2),
            'transactions'    => $transactions,
        ]);
    }

    // =========================================================
    // R3 — Account Statement with Running Balance  كشف حساب محاسبي
    // =========================================================
    public function accountStatement(Request $request): JsonResponse
    {
        $request->validate([
            'account_id' => 'required|uuid|exists:tenant.accounts,id',
            'from'       => 'nullable|date',
            'to'         => 'nullable|date',
        ]);

        $tenantId  = (string) $this->getTenantId($request);
        $accountId = $request->get('account_id');
        $from      = $request->get('from', date('Y-m-01'));
        $to        = $request->get('to', date('Y-m-d'));

        // Opening balance = net movement before the period
        $opening = DB::connection('tenant')->table('journal_entry_lines')
            ->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
            ->where('journal_entries.tenant_id', $tenantId)
            ->where('journal_entry_lines.account_id', $accountId)
            ->where('journal_entries.is_posted', 1)
            ->whereDate('journal_entries.date', '<', $from)
            ->selectRaw('COALESCE(SUM(debit),0) as total_debit, COALESCE(SUM(credit),0) as total_credit')
            ->first();

        $openingDebit  = (float)($opening->total_debit ?? 0);
        $openingCredit = (float)($opening->total_credit ?? 0);

        // Account type to determine normal balance
        $account = DB::connection('tenant')->table('accounts')
            ->where('id', $accountId)
            ->first();

        $normalBalanceIsDebit = in_array($account->type ?? '', ['asset', 'expense']);
        $openingBalance = $normalBalanceIsDebit
            ? $openingDebit - $openingCredit
            : $openingCredit - $openingDebit;

        // Transactions in period
        $lines = DB::connection('tenant')->table('journal_entry_lines')
            ->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
            ->where('journal_entries.tenant_id', $tenantId)
            ->where('journal_entry_lines.account_id', $accountId)
            ->where('journal_entries.is_posted', 1)
            ->whereBetween('journal_entries.date', [$from, $to])
            ->select(
                'journal_entries.id as journal_entry_id',
                'journal_entries.entry_number',
                'journal_entries.date',
                'journal_entries.description as je_description',
                'journal_entries.reference_type',
                'journal_entry_lines.debit',
                'journal_entry_lines.credit',
                'journal_entry_lines.description as line_description'
            )
            ->orderBy('journal_entries.date')
            ->orderBy('journal_entries.entry_number')
            ->get();

        $balance = $openingBalance;
        $transactions = [];
        $totalDebit = 0.0;
        $totalCredit = 0.0;

        foreach ($lines as $line) {
            $debit  = (float)$line->debit;
            $credit = (float)$line->credit;
            $balance += $normalBalanceIsDebit ? ($debit - $credit) : ($credit - $debit);
            $totalDebit  += $debit;
            $totalCredit += $credit;

            $transactions[] = [
                'journal_entry_id' => $line->journal_entry_id,
                'entry_number'     => $line->entry_number,
                'date'             => $line->date,
                'description'      => $line->line_description ?: $line->je_description,
                'reference_type'   => $line->reference_type,
                'debit'            => round($debit, 2),
                'credit'           => round($credit, 2),
                'running_balance'  => round($balance, 2),
            ];
        }

        return $this->success([
            'account'         => $account,
            'period'          => ['from' => $from, 'to' => $to],
            'opening_balance' => round($openingBalance, 2),
            'closing_balance' => round($balance, 2),
            'total_debit'     => round($totalDebit, 2),
            'total_credit'    => round($totalCredit, 2),
            'transactions'    => $transactions,
        ]);
    }

    // =========================================================
    // R4 — Fixed Asset Register  سجل الأصول الثابتة
    // =========================================================
    public function fixedAssetRegister(Request $request): JsonResponse
    {
        $tenantId = (string) $this->getTenantId($request);
        $status   = $request->get('status', 'active'); // active|disposed|sold|all

        $query = DB::connection('tenant')->table('fixed_assets')
            ->leftJoin('accounts', 'fixed_assets.account_id', '=', 'accounts.id')
            ->where('fixed_assets.tenant_id', $tenantId)
            ->whereNull('fixed_assets.deleted_at');

        if ($status !== 'all') {
            $query->where('fixed_assets.status', $status);
        }

        $assets = $query->select(
            'fixed_assets.id',
            'fixed_assets.name',
            'fixed_assets.name_ar',
            'fixed_assets.serial_number',
            'fixed_assets.purchase_date',
            'fixed_assets.purchase_cost',
            'fixed_assets.salvage_value',
            'fixed_assets.useful_life_years',
            'fixed_assets.depreciation_method',
            'fixed_assets.accumulated_depreciation',
            'fixed_assets.current_value',
            'fixed_assets.status',
            'fixed_assets.notes',
            'accounts.code  as account_code',
            'accounts.name  as account_name'
        )->orderBy('fixed_assets.purchase_date')->get();

        $today  = now();
        $rows   = [];
        $totals = ['purchase_cost' => 0.0, 'accumulated_depreciation' => 0.0, 'book_value' => 0.0];

        foreach ($assets as $asset) {
            $purchaseDate  = \Carbon\Carbon::parse($asset->purchase_date);
            $totalMonths   = (int)$asset->useful_life_years * 12;
            $elapsedMonths = min($totalMonths, (int)$purchaseDate->diffInMonths($today));
            $remainingMonths = max(0, $totalMonths - $elapsedMonths);
            $endDate       = $purchaseDate->copy()->addMonths($totalMonths);
            $bookValue     = (float)$asset->current_value;
            $accumDepr     = (float)$asset->accumulated_depreciation;

            $rows[] = [
                'id'                       => $asset->id,
                'name'                     => $asset->name,
                'name_ar'                  => $asset->name_ar,
                'serial_number'            => $asset->serial_number,
                'purchase_date'            => $asset->purchase_date,
                'purchase_cost'            => round((float)$asset->purchase_cost, 2),
                'salvage_value'            => round((float)$asset->salvage_value, 2),
                'useful_life_years'        => $asset->useful_life_years,
                'depreciation_method'      => $asset->depreciation_method ?? 'straight_line',
                'accumulated_depreciation' => round($accumDepr, 2),
                'book_value'               => round($bookValue, 2),
                'depreciation_rate'        => $totalMonths > 0
                    ? round(100 / (int)$asset->useful_life_years, 2) . '%'
                    : '0%',
                'months_elapsed'           => $elapsedMonths,
                'months_remaining'         => $remainingMonths,
                'end_of_life_date'         => $endDate->toDateString(),
                'status'                   => $asset->status,
                'account_code'             => $asset->account_code,
                'account_name'             => $asset->account_name,
            ];

            $totals['purchase_cost']            += (float)$asset->purchase_cost;
            $totals['accumulated_depreciation'] += $accumDepr;
            $totals['book_value']               += $bookValue;
        }

        return $this->success([
            'as_of'  => now()->toDateString(),
            'filter' => $status,
            'assets' => $rows,
            'totals' => [
                'purchase_cost'            => round($totals['purchase_cost'], 2),
                'accumulated_depreciation' => round($totals['accumulated_depreciation'], 2),
                'book_value'               => round($totals['book_value'], 2),
                'count'                    => count($rows),
            ],
        ]);
    }

    // =========================================================
    // R5 — Monthly P&L  قائمة الدخل الشهرية
    // =========================================================
    public function monthlyPnl(Request $request): JsonResponse
    {
        $request->validate([
            'year'          => 'required|integer|min:2000|max:2100',
            'cost_center_id'=> 'nullable|uuid',
        ]);

        $tenantId     = (string) $this->getTenantId($request);
        $year         = (int)$request->get('year');
        $costCenterId = $request->get('cost_center_id');

        $months = [];
        $annualRevenue = 0.0;
        $annualExpense = 0.0;

        for ($m = 1; $m <= 12; $m++) {
            $from = sprintf('%04d-%02d-01', $year, $m);
            $to   = date('Y-m-t', strtotime($from));

            $query = DB::connection('tenant')->table('journal_entry_lines')
                ->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
                ->join('accounts', 'journal_entry_lines.account_id', '=', 'accounts.id')
                ->where('journal_entries.tenant_id', $tenantId)
                ->where('journal_entries.is_posted', 1)
                ->whereBetween('journal_entries.date', [$from, $to])
                ->whereIn('accounts.type', ['revenue', 'expense'])
                ->selectRaw("
                    accounts.type,
                    SUM(journal_entry_lines.credit) as total_credit,
                    SUM(journal_entry_lines.debit)  as total_debit
                ")
                ->groupBy('accounts.type');

            if ($costCenterId) {
                $query->where('journal_entry_lines.cost_center_id', $costCenterId);
            }

            $rows    = $query->get()->keyBy('type');
            $revenue = (float)($rows['revenue']->total_credit ?? 0) - (float)($rows['revenue']->total_debit ?? 0);
            $expense = (float)($rows['expense']->total_debit ?? 0) - (float)($rows['expense']->total_credit ?? 0);

            $months[] = [
                'month'      => $m,
                'month_name' => date('F', mktime(0, 0, 0, $m, 1)),
                'from'       => $from,
                'to'         => $to,
                'revenue'    => round($revenue, 2),
                'expense'    => round($expense, 2),
                'net_income' => round($revenue - $expense, 2),
                'margin_pct' => $revenue > 0
                    ? round((($revenue - $expense) / $revenue) * 100, 1)
                    : 0,
            ];

            $annualRevenue += $revenue;
            $annualExpense += $expense;
        }

        return $this->success([
            'year'           => $year,
            'months'         => $months,
            'annual_revenue' => round($annualRevenue, 2),
            'annual_expense' => round($annualExpense, 2),
            'annual_net'     => round($annualRevenue - $annualExpense, 2),
            'annual_margin'  => $annualRevenue > 0
                ? round((($annualRevenue - $annualExpense) / $annualRevenue) * 100, 1)
                : 0,
        ]);
    }

    // =========================================================
    // R6 — VAT Detail Report  تقرير ضريبة القيمة المضافة التفصيلي
    // =========================================================
    public function vatDetail(Request $request): JsonResponse
    {
        $request->validate([
            'from' => 'required|date',
            'to'   => 'required|date|after_or_equal:from',
        ]);

        $tenantId = (string) $this->getTenantId($request);
        $from     = $request->get('from');
        $to       = $request->get('to');

        // Output VAT — from sales invoices
        $outputVat = DB::connection('tenant')->table('invoices')
            ->where('tenant_id', $tenantId)
            ->where('status', 'confirmed')
            ->whereBetween('invoice_date', [$from, $to])
            ->selectRaw('
                COUNT(*)                               as count,
                COALESCE(SUM(subtotal), 0)             as net_amount,
                COALESCE(SUM(tax_amount), 0)           as vat_amount,
                COALESCE(SUM(total), 0)                as gross_amount
            ')
            ->first();

        // Input VAT — from purchase_invoices
        $inputVat = DB::connection('tenant')->table('purchase_invoices')
            ->where('tenant_id', $tenantId)
            ->where('status', 'confirmed')
            ->whereBetween('invoice_date', [$from, $to])
            ->selectRaw('
                COUNT(*)                     as count,
                COALESCE(SUM(subtotal), 0)   as net_amount,
                COALESCE(SUM(vat_amount), 0) as vat_amount,
                COALESCE(SUM(total), 0)      as gross_amount
            ')
            ->first();

        // VAT on Sales Returns (reduces output VAT)
        $salesReturnVat = DB::connection('tenant')->table('sales_returns')
            ->whereBetween('return_date', [$from, $to])
            ->selectRaw('COALESCE(SUM(vat_amount), 0) as vat_amount')
            ->value('vat_amount') ?? 0;

        // VAT on Purchase Returns (reduces input VAT)
        $purchaseReturnVat = DB::connection('tenant')->table('purchase_returns')
            ->whereBetween('issue_date', [$from, $to])
            ->selectRaw('COALESCE(SUM(tax_amount), 0) as vat_amount')
            ->value('vat_amount') ?? 0;

        // Invoice-level detail for output VAT
        $outputDetail = DB::connection('tenant')->table('invoices')
            ->join('customers', 'invoices.customer_id', '=', 'customers.id')
            ->where('invoices.tenant_id', $tenantId)
            ->where('invoices.status', 'confirmed')
            ->whereBetween('invoices.invoice_date', [$from, $to])
            ->whereRaw('COALESCE(invoices.vat_amount, 0) > 0')
            ->select(
                'invoices.invoice_number',
                'invoices.invoice_date',
                'customers.name as customer_name',
                'invoices.subtotal as net_amount',
                'invoices.vat_amount as vat_amount',
                'invoices.total as gross_amount'
            )
            ->orderBy('invoices.invoice_date')
            ->get();

        // Purchase-level detail for input VAT
        $inputDetail = DB::connection('tenant')->table('purchase_invoices')
            ->join('suppliers', 'purchase_invoices.supplier_id', '=', 'suppliers.id')
            ->where('purchase_invoices.tenant_id', $tenantId)
            ->where('purchase_invoices.status', 'confirmed')
            ->whereBetween('purchase_invoices.invoice_date', [$from, $to])
            ->whereRaw('COALESCE(purchase_invoices.vat_amount, 0) > 0')
            ->select(
                'purchase_invoices.invoice_number',
                'purchase_invoices.invoice_date',
                'suppliers.name as supplier_name',
                'purchase_invoices.subtotal as net_amount',
                'purchase_invoices.vat_amount as vat_amount',
                'purchase_invoices.total as gross_amount'
            )
            ->orderBy('purchase_invoices.invoice_date')
            ->get();

        $netOutputVat = (float)$outputVat->vat_amount - (float)$salesReturnVat;
        $netInputVat  = (float)$inputVat->vat_amount  - (float)$purchaseReturnVat;
        $vatPayable   = $netOutputVat - $netInputVat;

        return $this->success([
            'period' => ['from' => $from, 'to' => $to],
            'output_vat' => [
                'label'          => 'ضريبة المخرجات / Output VAT (Sales)',
                'count'          => (int)$outputVat->count,
                'net_amount'     => round((float)$outputVat->net_amount, 2),
                'vat_amount'     => round((float)$outputVat->vat_amount, 2),
                'returns_vat'    => round((float)$salesReturnVat, 2),
                'net_vat'        => round($netOutputVat, 2),
                'detail'         => $outputDetail,
            ],
            'input_vat' => [
                'label'          => 'ضريبة المدخلات / Input VAT (Purchases)',
                'count'          => (int)$inputVat->count,
                'net_amount'     => round((float)$inputVat->net_amount, 2),
                'vat_amount'     => round((float)$inputVat->vat_amount, 2),
                'returns_vat'    => round((float)$purchaseReturnVat, 2),
                'net_vat'        => round($netInputVat, 2),
                'detail'         => $inputDetail,
            ],
            'net_vat_payable' => round($vatPayable, 2),
            'status'          => $vatPayable >= 0 ? 'payable' : 'refundable',
        ]);
    }

    // =========================================================
    // R7 — Bank Position Report  وضع البنوك
    // =========================================================
    public function bankPosition(Request $request): JsonResponse
    {
        $accounts = DB::connection('tenant')->table('bank_accounts')
            ->leftJoin('accounts', 'bank_accounts.chart_of_account_id', '=', 'accounts.id')
            ->select(
                'bank_accounts.id',
                'bank_accounts.name',
                'bank_accounts.account_number',
                'bank_accounts.bank_name',
                'bank_accounts.currency_id',
                'bank_accounts.opening_balance',
                'bank_accounts.current_balance',
                'accounts.code as gl_account_code',
                'accounts.name as gl_account_name'
            )
            ->get();

        // Last reconciliation date for each account
        $lastRecon = DB::connection('tenant')->table('reconciliations')
            ->where('status', 'completed')
            ->selectRaw('bank_account_id, MAX(statement_date) as last_reconciled_date')
            ->groupBy('bank_account_id')
            ->get()
            ->keyBy('bank_account_id');

        // Unreconciled transactions count
        $unreconciled = DB::connection('tenant')->table('bank_transactions')
            ->where('is_reconciled', false)
            ->selectRaw('bank_account_id, COUNT(*) as count')
            ->groupBy('bank_account_id')
            ->get()
            ->keyBy('bank_account_id');

        $rows = [];
        $totalBalance = 0.0;

        foreach ($accounts as $acc) {
            $balance = (float)$acc->current_balance;
            $totalBalance += $balance;

            $rows[] = [
                'id'                    => $acc->id,
                'name'                  => $acc->name,
                'account_number'        => $acc->account_number,
                'bank_name'             => $acc->bank_name,
                'currency_id'           => $acc->currency_id,
                'opening_balance'       => round((float)$acc->opening_balance, 2),
                'current_balance'       => round($balance, 2),
                'gl_account_code'       => $acc->gl_account_code,
                'gl_account_name'       => $acc->gl_account_name,
                'last_reconciled_date'  => $lastRecon[$acc->id]->last_reconciled_date ?? null,
                'unreconciled_count'    => (int)($unreconciled[$acc->id]->count ?? 0),
            ];
        }

        return $this->success([
            'as_of'         => now()->toDateString(),
            'accounts'      => $rows,
            'total_balance' => round($totalBalance, 2),
            'account_count' => count($rows),
        ]);
    }

    // =========================================================
    // R8 — Expense Analysis  تحليل المصروفات
    // =========================================================
    public function expenseAnalysis(Request $request): JsonResponse
    {
        $request->validate([
            'from'           => 'required|date',
            'to'             => 'required|date|after_or_equal:from',
            'compare_from'   => 'nullable|date',
            'compare_to'     => 'nullable|date',
            'cost_center_id' => 'nullable|uuid',
        ]);

        $tenantId     = (string) $this->getTenantId($request);
        $from         = $request->get('from');
        $to           = $request->get('to');
        $costCenterId = $request->get('cost_center_id');

        $current   = $this->getExpenseBreakdown($tenantId, $from, $to, $costCenterId);
        $compare   = null;
        $comparePeriod = null;

        if ($request->has('compare_from') && $request->has('compare_to')) {
            $comparePeriod = ['from' => $request->get('compare_from'), 'to' => $request->get('compare_to')];
            $compare = $this->getExpenseBreakdown($tenantId, $comparePeriod['from'], $comparePeriod['to'], $costCenterId);
        }

        // Merge comparison into current
        $merged = [];
        foreach ($current as $item) {
            $compareAmount = 0.0;
            if ($compare) {
                $compareItem = collect($compare)->firstWhere('account_id', $item['account_id']);
                $compareAmount = $compareItem ? (float)$compareItem['amount'] : 0.0;
            }
            $merged[] = array_merge($item, [
                'compare_amount' => round($compareAmount, 2),
                'variance'       => round($item['amount'] - $compareAmount, 2),
                'variance_pct'   => $compareAmount > 0
                    ? round((($item['amount'] - $compareAmount) / $compareAmount) * 100, 1)
                    : null,
            ]);
        }

        usort($merged, fn($a, $b) => $b['amount'] <=> $a['amount']);

        $totalCurrent = array_sum(array_column($merged, 'amount'));
        $totalCompare = $compare ? array_sum(array_column($compare, 'amount')) : null;

        return $this->success([
            'period'         => ['from' => $from, 'to' => $to],
            'compare_period' => $comparePeriod,
            'expenses'       => $merged,
            'total_expenses' => round($totalCurrent, 2),
            'compare_total'  => $totalCompare ? round($totalCompare, 2) : null,
        ]);
    }

    private function getExpenseBreakdown(string $tenantId, string $from, string $to, ?string $costCenterId): array
    {
        $query = DB::connection('tenant')->table('journal_entry_lines')
            ->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
            ->join('accounts', 'journal_entry_lines.account_id', '=', 'accounts.id')
            ->where('journal_entries.tenant_id', $tenantId)
            ->where('journal_entries.is_posted', 1)
            ->where('accounts.type', 'expense')
            ->whereBetween('journal_entries.date', [$from, $to])
            ->select(
                'accounts.id as account_id',
                'accounts.code',
                'accounts.name',
                'accounts.name_ar',
                DB::raw('COALESCE(SUM(journal_entry_lines.debit - journal_entry_lines.credit), 0) as amount')
            )
            ->groupBy('accounts.id', 'accounts.code', 'accounts.name', 'accounts.name_ar')
            ->orderBy('accounts.code');

        if ($costCenterId) {
            $query->where('journal_entry_lines.cost_center_id', $costCenterId);
        }

        return $query->get()->map(fn($r) => [
            'account_id' => $r->account_id,
            'code'       => $r->code,
            'name'       => $r->name,
            'name_ar'    => $r->name_ar,
            'amount'     => round((float)$r->amount, 2),
        ])->toArray();
    }

    // =========================================================
    // R9 — Combined Depreciation Schedule  جدول استهلاك جميع الأصول
    // =========================================================
    public function depreciationScheduleAll(Request $request): JsonResponse
    {
        $request->validate([
            'from' => 'nullable|date',
            'to'   => 'nullable|date',
        ]);

        $tenantId = (string) $this->getTenantId($request);
        $from     = $request->get('from', date('Y-01-01'));
        $to       = $request->get('to', date('Y-12-31'));

        $assets = DB::connection('tenant')->table('fixed_assets')
            ->where('tenant_id', $tenantId)
            ->whereIn('status', ['active'])
            ->whereNull('deleted_at')
            ->select('id', 'name', 'name_ar', 'purchase_cost', 'salvage_value',
                     'useful_life_years', 'accumulated_depreciation', 'current_value',
                     'depreciation_method', 'purchase_date')
            ->get();

        $result = [];
        $totalScheduledDepr = 0.0;

        foreach ($assets as $asset) {
            $entries = DB::connection('tenant')->table('fixed_asset_depreciation_entries')
                ->where('fixed_asset_id', $asset->id)
                ->whereBetween('period_end', [$from, $to])
                ->orderBy('period_end')
                ->select('period_start', 'period_end', 'depreciation_amount',
                         'accumulated_depreciation', 'book_value')
                ->get();

            $assetTotal = $entries->sum('depreciation_amount');
            $totalScheduledDepr += $assetTotal;

            $result[] = [
                'asset_id'               => $asset->id,
                'name'                   => $asset->name,
                'name_ar'                => $asset->name_ar,
                'purchase_cost'          => round((float)$asset->purchase_cost, 2),
                'salvage_value'          => round((float)$asset->salvage_value, 2),
                'useful_life_years'      => $asset->useful_life_years,
                'depreciation_method'    => $asset->depreciation_method ?? 'straight_line',
                'opening_book_value'     => round((float)$asset->current_value + $entries->first()?->depreciation_amount ?? 0, 2),
                'period_depreciation'    => round($assetTotal, 2),
                'accumulated_at_end'     => round((float)($entries->last()->accumulated_depreciation ?? $asset->accumulated_depreciation), 2),
                'closing_book_value'     => round((float)($entries->last()->book_value ?? $asset->current_value), 2),
                'entries'                => $entries->map(fn($e) => [
                    'period_start'            => $e->period_start,
                    'period_end'              => $e->period_end,
                    'depreciation_amount'     => round((float)$e->depreciation_amount, 2),
                    'accumulated_depreciation'=> round((float)$e->accumulated_depreciation, 2),
                    'book_value'              => round((float)$e->book_value, 2),
                ]),
            ];
        }

        return $this->success([
            'period'                  => ['from' => $from, 'to' => $to],
            'assets'                  => $result,
            'total_scheduled_depr'    => round($totalScheduledDepr, 2),
            'asset_count'             => count($result),
        ]);
    }

    // =========================================================
    // R10 — Budget Utilization Summary  ملخص استخدام الميزانية
    // =========================================================
    public function budgetUtilization(Request $request): JsonResponse
    {
        $request->validate([
            'fiscal_year' => 'nullable|string',
            'status'      => 'nullable|in:draft,approved,closed,all',
        ]);

        $tenantId   = (string) $this->getTenantId($request);
        $fiscalYear = $request->get('fiscal_year');
        $status     = $request->get('status', 'approved');

        $budgetsQuery = DB::connection('tenant')->table('budgets')
            ->where('tenant_id', $tenantId)
            ->whereNull('deleted_at');

        if ($fiscalYear) {
            $budgetsQuery->where('fiscal_year', $fiscalYear);
        }
        if ($status !== 'all') {
            $budgetsQuery->where('status', $status);
        }

        $budgets = $budgetsQuery->get();

        $result = [];
        $grandBudget = 0.0;
        $grandActual = 0.0;

        foreach ($budgets as $budget) {
            // Total budget amount from budget_items
            $budgetItems = DB::connection('tenant')->table('budget_items')
                ->join('accounts', 'budget_items.account_id', '=', 'accounts.id')
                ->where('budget_items.budget_id', $budget->id)
                ->select(
                    'accounts.type',
                    DB::raw('SUM(budget_items.total) as budget_total')
                )
                ->groupBy('accounts.type')
                ->get()
                ->keyBy('type');

            $totalBudget = collect($budgetItems)->sum('budget_total');

            // Actual amounts from journal entries in the budget period
            $actuals = DB::connection('tenant')->table('journal_entry_lines')
                ->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
                ->join('accounts', 'journal_entry_lines.account_id', '=', 'accounts.id')
                ->where('journal_entries.tenant_id', $tenantId)
                ->where('journal_entries.is_posted', 1)
                ->whereBetween('journal_entries.date', [$budget->period_start, $budget->period_end])
                ->select(
                    'accounts.type',
                    DB::raw('SUM(journal_entry_lines.debit) as total_debit'),
                    DB::raw('SUM(journal_entry_lines.credit) as total_credit')
                )
                ->groupBy('accounts.type')
                ->get()
                ->keyBy('type');

            $actualRevenue = (float)(($actuals['revenue']->total_credit ?? 0) - ($actuals['revenue']->total_debit ?? 0));
            $actualExpense = (float)(($actuals['expense']->total_debit ?? 0) - ($actuals['expense']->total_credit ?? 0));
            $totalActual   = $actualRevenue + $actualExpense;

            $variance = $totalBudget - $totalActual;
            $utilizationPct = $totalBudget > 0
                ? round(($totalActual / $totalBudget) * 100, 1)
                : 0;

            $grandBudget += $totalBudget;
            $grandActual += $totalActual;

            $result[] = [
                'budget_id'      => $budget->id,
                'name'           => $budget->name,
                'fiscal_year'    => $budget->fiscal_year,
                'period_start'   => $budget->period_start,
                'period_end'     => $budget->period_end,
                'status'         => $budget->status,
                'total_budget'   => round($totalBudget, 2),
                'total_actual'   => round($totalActual, 2),
                'variance'       => round($variance, 2),
                'utilization_pct'=> $utilizationPct,
                'revenue_actual' => round($actualRevenue, 2),
                'expense_actual' => round($actualExpense, 2),
                'by_type'        => collect($budgetItems)->map(fn($item, $type) => [
                    'type'         => $type,
                    'budget'       => round((float)$item->budget_total, 2),
                    'actual'       => match($type) {
                        'revenue' => round($actualRevenue, 2),
                        'expense' => round($actualExpense, 2),
                        default   => 0.0,
                    },
                ])->values(),
            ];
        }

        usort($result, fn($a, $b) => $b['utilization_pct'] <=> $a['utilization_pct']);

        return $this->success([
            'budgets'      => $result,
            'grand_budget' => round($grandBudget, 2),
            'grand_actual' => round($grandActual, 2),
            'grand_variance' => round($grandBudget - $grandActual, 2),
            'overall_utilization_pct' => $grandBudget > 0
                ? round(($grandActual / $grandBudget) * 100, 1)
                : 0,
        ]);
    }

    // =========================================================
    // R11 — Quarterly VAT Return  الإقرار الضريبي الفصلي (ZATCA)
    // =========================================================
    public function quarterlyVat(Request $request): JsonResponse
    {
        $request->validate([
            'year'    => 'required|integer|min:2000|max:2100',
            'quarter' => 'nullable|integer|in:1,2,3,4',
        ]);

        $tenantId = (string) $this->getTenantId($request);
        $year     = (int)$request->get('year');
        $quarter  = $request->get('quarter') ? (int)$request->get('quarter') : null;

        $quarters = $quarter ? [$quarter] : [1, 2, 3, 4];
        $result   = [];

        foreach ($quarters as $q) {
            $startMonth = (($q - 1) * 3) + 1;
            $endMonth   = $startMonth + 2;
            $from       = sprintf('%04d-%02d-01', $year, $startMonth);
            $to         = date('Y-m-t', strtotime(sprintf('%04d-%02d-01', $year, $endMonth)));

            // Standard rated sales (15% VAT)
            $sales = DB::connection('tenant')->table('invoices')
                ->where('tenant_id', $tenantId)
                ->where('status', 'confirmed')
                ->whereBetween('invoice_date', [$from, $to])
                ->selectRaw('
                    COALESCE(SUM(subtotal), 0) as taxable_sales,
                    COALESCE(SUM(vat_amount), 0) as output_vat,
                    COALESCE(SUM(total), 0) as gross_sales,
                    COUNT(*) as invoice_count
                ')
                ->first();

            // Sales returns (reduce output VAT)
            $salesReturns = DB::connection('tenant')->table('sales_returns')
                ->where('tenant_id', $tenantId)
                ->whereBetween('return_date', [$from, $to])
                ->selectRaw('
                    COALESCE(SUM(vat_amount), 0) as vat_amount,
                    COALESCE(SUM(total_amount), 0) as total_amount
                ')
                ->first();

            // Standard rated purchases (input VAT)
            $purchases = DB::connection('tenant')->table('purchases')
                ->where('tenant_id', $tenantId)
                ->where('status', 'confirmed')
                ->whereBetween('purchase_date', [$from, $to])
                ->selectRaw('
                    COALESCE(SUM(subtotal), 0) as taxable_purchases,
                    COALESCE(SUM(vat_amount), 0) as input_vat,
                    COUNT(*) as invoice_count
                ')
                ->first();

            // Purchase returns (reduce input VAT)
            $purchaseReturns = DB::connection('tenant')->table('purchase_returns')
                ->where('tenant_id', $tenantId)
                ->whereBetween('return_date', [$from, $to])
                ->selectRaw('COALESCE(SUM(vat_amount), 0) as vat_amount')
                ->value('vat_amount') ?? 0;

            $netOutputVat = (float)$sales->output_vat - (float)$salesReturns->vat_amount;
            $netInputVat  = (float)$purchases->input_vat - (float)$purchaseReturns;
            $vatDue       = $netOutputVat - $netInputVat;

            $result[] = [
                'quarter'          => $q,
                'quarter_label'    => "Q{$q} {$year}",
                'period'           => ['from' => $from, 'to' => $to],
                'standard_rated_sales' => [
                    'taxable_amount'  => round((float)$sales->taxable_sales, 2),
                    'vat_amount'      => round((float)$sales->output_vat, 2),
                    'invoice_count'   => (int)$sales->invoice_count,
                ],
                'sales_returns' => [
                    'taxable_amount' => round((float)$salesReturns->total_amount, 2),
                    'vat_amount'     => round((float)$salesReturns->vat_amount, 2),
                ],
                'net_output_vat'   => round($netOutputVat, 2),
                'standard_rated_purchases' => [
                    'taxable_amount' => round((float)$purchases->taxable_purchases, 2),
                    'vat_amount'     => round((float)$purchases->input_vat, 2),
                    'invoice_count'  => (int)$purchases->invoice_count,
                ],
                'purchase_returns' => [
                    'vat_amount' => round((float)$purchaseReturns, 2),
                ],
                'net_input_vat'    => round($netInputVat, 2),
                'vat_due'          => round($vatDue, 2),
                'status'           => $vatDue >= 0 ? 'payable' : 'refundable',
            ];
        }

        return $this->success([
            'year'     => $year,
            'quarters' => $result,
            'annual_summary' => [
                'total_output_vat' => round(array_sum(array_column($result, 'net_output_vat')), 2),
                'total_input_vat'  => round(array_sum(array_column($result, 'net_input_vat')), 2),
                'total_vat_due'    => round(array_sum(array_column($result, 'vat_due')), 2),
            ],
        ]);
    }

    // =========================================================
    // R12 — DSO — Days Sales Outstanding  متوسط أيام التحصيل
    // =========================================================
    public function dso(Request $request): JsonResponse
    {
        $request->validate([
            'from' => 'required|date',
            'to'   => 'required|date|after_or_equal:from',
        ]);

        $tenantId = (string) $this->getTenantId($request);
        $from     = $request->get('from');
        $to       = $request->get('to');

        // All confirmed invoices in period
        $invoices = DB::connection('tenant')->table('invoices')
            ->join('customers', 'invoices.customer_id', '=', 'customers.id')
            ->where('invoices.tenant_id', $tenantId)
            ->where('invoices.status', 'confirmed')
            ->whereBetween('invoices.invoice_date', [$from, $to])
            ->select(
                'invoices.id',
                'customers.name as customer_name',
                'invoices.invoice_date',
                'invoices.due_date',
                'invoices.total',
                'invoices.paid_amount',
                DB::raw('(invoices.total - invoices.paid_amount) as outstanding'),
                'invoices.payment_status'
            )
            ->get();

        // Average collection days for fully paid invoices
        $collectedInvoices = DB::connection('tenant')->table('invoices')
            ->join('customer_payments', 'customer_payments.customer_id', '=', 'invoices.customer_id')
            ->where('invoices.tenant_id', $tenantId)
            ->where('invoices.status', 'confirmed')
            ->where('invoices.payment_status', 'paid')
            ->whereBetween('invoices.invoice_date', [$from, $to])
            ->selectRaw('
                invoices.id,
                invoices.invoice_date,
                MIN(customer_payments.payment_date) as first_payment_date
            ')
            ->groupBy('invoices.id', 'invoices.invoice_date')
            ->get();

        $totalDays = 0;
        $count     = 0;
        foreach ($collectedInvoices as $inv) {
            if ($inv->first_payment_date) {
                $days = \Carbon\Carbon::parse($inv->invoice_date)
                    ->diffInDays(\Carbon\Carbon::parse($inv->first_payment_date));
                $totalDays += $days;
                $count++;
            }
        }
        $avgDso = $count > 0 ? round($totalDays / $count, 1) : null;

        // Total AR outstanding
        $totalOutstanding = $invoices->sum('outstanding');
        $totalRevenue     = $invoices->sum('total');
        $periodDays       = \Carbon\Carbon::parse($from)->diffInDays(\Carbon\Carbon::parse($to)) + 1;
        $dailyRevenue     = $periodDays > 0 ? $totalRevenue / $periodDays : 0;
        $dsoFormula       = $dailyRevenue > 0 ? round($totalOutstanding / $dailyRevenue, 1) : null;

        // By customer
        $byCustomer = $invoices->groupBy('customer_name')->map(function ($invGroup, $customerName) {
            $outstanding  = $invGroup->sum('outstanding');
            $overdue      = $invGroup->filter(fn($i) => $i->due_date && $i->due_date < now()->toDateString() && $i->outstanding > 0)->sum('outstanding');
            return [
                'customer_name'  => $customerName,
                'invoice_count'  => $invGroup->count(),
                'total_amount'   => round($invGroup->sum('total'), 2),
                'outstanding'    => round($outstanding, 2),
                'overdue'        => round($overdue, 2),
            ];
        })->sortByDesc('outstanding')->values();

        return $this->success([
            'period'              => ['from' => $from, 'to' => $to],
            'dso_days'            => $avgDso,
            'dso_formula_days'    => $dsoFormula,
            'total_revenue'       => round($totalRevenue, 2),
            'total_outstanding'   => round($totalOutstanding, 2),
            'collection_rate_pct' => $totalRevenue > 0
                ? round((($totalRevenue - $totalOutstanding) / $totalRevenue) * 100, 1)
                : 0,
            'by_customer'         => $byCustomer,
        ]);
    }

    // =========================================================
    // R13 — DPO — Days Payable Outstanding  متوسط أيام السداد للموردين
    // =========================================================
    public function dpo(Request $request): JsonResponse
    {
        $request->validate([
            'from' => 'required|date',
            'to'   => 'required|date|after_or_equal:from',
        ]);

        $tenantId = (string) $this->getTenantId($request);
        $from     = $request->get('from');
        $to       = $request->get('to');

        $purchases = DB::connection('tenant')->table('purchase_invoices')
            ->join('suppliers', 'purchase_invoices.supplier_id', '=', 'suppliers.id')
            ->where('purchase_invoices.tenant_id', $tenantId)
            ->where('purchase_invoices.status', 'confirmed')
            ->whereBetween('purchase_invoices.invoice_date', [$from, $to])
            ->select(
                'purchase_invoices.id',
                'suppliers.name as supplier_name',
                'purchase_invoices.invoice_date',
                'purchase_invoices.total',
                'purchase_invoices.paid_amount',
                DB::raw('(purchase_invoices.total - purchase_invoices.paid_amount) as outstanding'),
                'purchase_invoices.payment_status'
            )
            ->get();

        // Average payment days for fully paid purchases
        $paidPurchases = DB::connection('tenant')->table('purchase_invoices')
            ->join('supplier_payments', 'supplier_payments.supplier_id', '=', 'purchase_invoices.supplier_id')
            ->where('purchase_invoices.tenant_id', $tenantId)
            ->where('purchase_invoices.status', 'confirmed')
            ->where('purchase_invoices.payment_status', 'paid')
            ->whereBetween('purchase_invoices.invoice_date', [$from, $to])
            ->selectRaw('
                purchase_invoices.id,
                purchase_invoices.invoice_date,
                MIN(supplier_payments.payment_date) as first_payment_date
            ')
            ->groupBy('purchase_invoices.id', 'purchase_invoices.invoice_date')
            ->get();

        $totalDays = 0;
        $count     = 0;
        foreach ($paidPurchases as $pur) {
            if ($pur->first_payment_date) {
                $days = \Carbon\Carbon::parse($pur->invoice_date)
                    ->diffInDays(\Carbon\Carbon::parse($pur->first_payment_date));
                $totalDays += $days;
                $count++;
            }
        }
        $avgDpo = $count > 0 ? round($totalDays / $count, 1) : null;

        $totalOutstanding = $purchases->sum('outstanding');
        $totalPurchases   = $purchases->sum('total');
        $periodDays       = \Carbon\Carbon::parse($from)->diffInDays(\Carbon\Carbon::parse($to)) + 1;
        $dailyCost        = $periodDays > 0 ? $totalPurchases / $periodDays : 0;
        $dpoFormula       = $dailyCost > 0 ? round($totalOutstanding / $dailyCost, 1) : null;

        $bySupplier = $purchases->groupBy('supplier_name')->map(function ($purGroup, $supplierName) {
            return [
                'supplier_name'  => $supplierName,
                'invoice_count'  => $purGroup->count(),
                'total_amount'   => round($purGroup->sum('total'), 2),
                'outstanding'    => round($purGroup->sum('outstanding'), 2),
            ];
        })->sortByDesc('outstanding')->values();

        return $this->success([
            'period'            => ['from' => $from, 'to' => $to],
            'dpo_days'          => $avgDpo,
            'dpo_formula_days'  => $dpoFormula,
            'total_purchases'   => round($totalPurchases, 2),
            'total_outstanding' => round($totalOutstanding, 2),
            'payment_rate_pct'  => $totalPurchases > 0
                ? round((($totalPurchases - $totalOutstanding) / $totalPurchases) * 100, 1)
                : 0,
            'by_supplier'       => $bySupplier,
        ]);
    }

    // =========================================================
    // R14 — Credit Note Summary  ملخص الإشعارات الدائنة
    // =========================================================
    public function creditNoteSummary(Request $request): JsonResponse
    {
        $request->validate([
            'from' => 'nullable|date',
            'to'   => 'nullable|date',
            'type' => 'nullable|in:customer,supplier,all',
        ]);

        $tenantId = (string) $this->getTenantId($request);
        $from     = $request->get('from');
        $to       = $request->get('to', now()->toDateString());
        $type     = $request->get('type', 'all');

        // credit_notes has no tenant_id — scoped via tenant DB connection

        // Summary by type + status
        $summary = DB::connection('tenant')->table('credit_notes')
            ->whereNull('deleted_at')
            ->when($type !== 'all', fn($q) => $q->where('type', $type))
            ->when($from, fn($q) => $q->whereDate('issue_date', '>=', $from))
            ->whereDate('issue_date', '<=', $to)
            ->select('type', 'status',
                DB::raw('COUNT(*) as count'),
                DB::raw('SUM(total) as total_amount'),
                DB::raw('SUM(vat_amount) as total_vat')
            )
            ->groupBy('type', 'status')
            ->get();

        // Detail list
        $detail = DB::connection('tenant')->table('credit_notes')
            ->leftJoin('customers', 'credit_notes.customer_id', '=', 'customers.id')
            ->leftJoin('suppliers', 'credit_notes.supplier_id', '=', 'suppliers.id')
            ->whereNull('credit_notes.deleted_at')
            ->when($type !== 'all', fn($q) => $q->where('type', $type))
            ->when($from, fn($q) => $q->whereDate('credit_notes.issue_date', '>=', $from))
            ->whereDate('credit_notes.issue_date', '<=', $to)
            ->select(
                'credit_notes.id',
                'credit_notes.credit_note_number',
                'credit_notes.type',
                'credit_notes.status',
                'credit_notes.issue_date',
                'credit_notes.total',
                'credit_notes.vat_amount',
                'credit_notes.reason',
                DB::raw('COALESCE(customers.name, suppliers.name) as party_name')
            )
            ->orderBy('credit_notes.issue_date', 'desc')
            ->get();

        // Group summary for quick view
        $grouped = [];
        foreach ($summary as $s) {
            $grouped[$s->type][$s->status] = [
                'count'        => (int)$s->count,
                'total_amount' => round((float)$s->total_amount, 2),
                'total_vat'    => round((float)$s->total_vat, 2),
            ];
        }

        return $this->success([
            'period'  => ['from' => $from, 'to' => $to],
            'filter'  => $type,
            'summary' => $grouped,
            'totals'  => [
                'count'        => $detail->count(),
                'total_amount' => round($detail->sum('total'), 2),
                'total_vat'    => round($detail->sum('vat_amount'), 2),
            ],
            'credit_notes' => $detail,
        ]);
    }

    // =========================================================
    // R15 — Bank Reconciliation Status  حالة التسويات البنكية
    // =========================================================
    public function bankReconciliationStatus(Request $request): JsonResponse
    {
        // bank_accounts has no tenant_id — scoped via tenant DB connection
        $accounts = DB::connection('tenant')->table('bank_accounts')
            ->select('id', 'name', 'bank_name', 'account_number', 'current_balance')
            ->get();

        $result = [];
        foreach ($accounts as $account) {
            // Last completed reconciliation
            $lastRecon = DB::connection('tenant')->table('reconciliations')
                ->where('bank_account_id', $account->id)
                ->where('status', 'completed')
                ->orderBy('statement_date', 'desc')
                ->select('id', 'statement_date', 'statement_balance', 'difference', 'completed_at')
                ->first();

            // Open/in-progress reconciliation (status: draft or completed only)
            $openRecon = DB::connection('tenant')->table('reconciliations')
                ->where('bank_account_id', $account->id)
                ->where('status', 'draft')
                ->select('id', 'statement_date', 'statement_balance', 'status')
                ->first();

            // Unreconciled transactions — types: deposit, withdrawal, fee, interest
            $unreconciledStats = DB::connection('tenant')->table('bank_transactions')
                ->where('bank_account_id', $account->id)
                ->where('is_reconciled', false)
                ->selectRaw("
                    COUNT(*) as count,
                    COALESCE(SUM(CASE WHEN type IN ('deposit','interest') THEN amount ELSE 0 END), 0) as credit_total,
                    COALESCE(SUM(CASE WHEN type IN ('withdrawal','fee') THEN amount ELSE 0 END), 0) as debit_total
                ")
                ->first();

            // Days since last reconciliation
            $daysSinceRecon = null;
            if ($lastRecon?->statement_date) {
                $daysSinceRecon = (int)\Carbon\Carbon::parse($lastRecon->statement_date)->diffInDays(now());
            }

            $result[] = [
                'account_id'              => $account->id,
                'account_name'            => $account->name,
                'bank_name'               => $account->bank_name,
                'account_number'          => $account->account_number,
                'current_balance'         => round((float)$account->current_balance, 2),
                'last_reconciliation'     => $lastRecon ? [
                    'date'              => $lastRecon->statement_date,
                    'statement_balance' => round((float)$lastRecon->statement_balance, 2),
                    'difference'        => round((float)$lastRecon->difference, 2),
                    'completed_at'      => $lastRecon->completed_at,
                ] : null,
                'open_reconciliation'     => $openRecon,
                'days_since_reconciliation'=> $daysSinceRecon,
                'unreconciled_items'      => [
                    'count'        => (int)$unreconciledStats->count,
                    'credit_total' => round((float)$unreconciledStats->credit_total, 2),
                    'debit_total'  => round((float)$unreconciledStats->debit_total, 2),
                ],
                'reconciliation_health'   => match(true) {
                    $unreconciledStats->count === 0 => 'clean',
                    ($daysSinceRecon ?? 999) <= 30  => 'good',
                    ($daysSinceRecon ?? 999) <= 60  => 'warning',
                    default                         => 'overdue',
                },
            ];
        }

        return $this->success([
            'as_of'    => now()->toDateString(),
            'accounts' => $result,
            'summary'  => [
                'total_accounts'        => count($result),
                'clean'                 => count(array_filter($result, fn($r) => $r['reconciliation_health'] === 'clean')),
                'good'                  => count(array_filter($result, fn($r) => $r['reconciliation_health'] === 'good')),
                'warning'               => count(array_filter($result, fn($r) => $r['reconciliation_health'] === 'warning')),
                'overdue'               => count(array_filter($result, fn($r) => $r['reconciliation_health'] === 'overdue')),
            ],
        ]);
    }

    // =========================================================
    // R16 — Journal Entry Audit Trail  سجل مراجعة القيود
    // =========================================================
    public function journalAuditTrail(Request $request): JsonResponse
    {
        $request->validate([
            'from'     => 'nullable|date',
            'to'       => 'nullable|date',
            'user_id'  => 'nullable|uuid',
            'action'   => 'nullable|string',
        ]);

        $from   = $request->get('from', date('Y-m-01'));
        $to     = $request->get('to', date('Y-m-d'));
        $userId = $request->get('user_id');
        $action = $request->get('action');

        // activity_logs are scoped to tenant via the users join (tenant DB connection)
        $query = DB::connection('tenant')->table('activity_logs')
            ->leftJoin('users', 'activity_logs.user_id', '=', 'users.id')
            ->where('activity_logs.model_type', 'journal_entry')
            ->whereBetween('activity_logs.created_at', [$from . ' 00:00:00', $to . ' 23:59:59'])
            ->select(
                'activity_logs.id',
                'activity_logs.user_id',
                DB::raw("COALESCE(users.name, 'System') as user_name"),
                'activity_logs.action',
                'activity_logs.model_id as journal_entry_id',
                'activity_logs.old_values',
                'activity_logs.new_values',
                'activity_logs.ip_address',
                'activity_logs.created_at'
            )
            ->orderBy('activity_logs.created_at', 'desc');

        if ($userId) {
            $query->where('activity_logs.user_id', $userId);
        }
        if ($action) {
            $query->where('activity_logs.action', $action);
        }

        $logs = $query->limit(500)->get();

        // Action summary
        $actionSummary = $logs->groupBy('action')->map(fn($g) => $g->count());

        // User summary
        $userSummary = $logs->groupBy('user_name')->map(fn($g) => [
            'count'  => $g->count(),
            'actions'=> $g->pluck('action')->unique()->values(),
        ]);

        return $this->success([
            'period'         => ['from' => $from, 'to' => $to],
            'logs'           => $logs,
            'total_entries'  => $logs->count(),
            'action_summary' => $actionSummary,
            'user_summary'   => $userSummary,
        ]);
    }

    // =========================================================
    // R17 — Expense Voucher Summary  ملخص المصروفات والسندات
    // =========================================================
    public function expenseVoucherSummary(Request $request): JsonResponse
    {
        $request->validate([
            'from'        => 'required|date',
            'to'          => 'required|date|after_or_equal:from',
            'category_id' => 'nullable|uuid',
            'safe_id'     => 'nullable|uuid',
        ]);

        $tenantId   = (string) $this->getTenantId($request);
        $from       = $request->get('from');
        $to         = $request->get('to');
        $categoryId = $request->get('category_id');
        $safeId     = $request->get('safe_id');

        // Summary by category
        $byCategory = DB::connection('tenant')->table('expenses')
            ->join('expense_categories', 'expenses.category_id', '=', 'expense_categories.id')
            ->where('expenses.tenant_id', $tenantId)
            ->whereBetween('expenses.expense_date', [$from, $to])
            ->whereNull('expenses.deleted_at')
            ->when($categoryId, fn($q) => $q->where('expenses.category_id', $categoryId))
            ->when($safeId, fn($q) => $q->where('expenses.safe_id', $safeId))
            ->select(
                'expense_categories.id as category_id',
                'expense_categories.name as category_name',
                'expense_categories.name_ar as category_name_ar',
                'expense_categories.is_advance_or_salary',
                DB::raw('COUNT(*) as count'),
                DB::raw('SUM(expenses.amount) as total_amount')
            )
            ->groupBy(
                'expense_categories.id',
                'expense_categories.name',
                'expense_categories.name_ar',
                'expense_categories.is_advance_or_salary'
            )
            ->orderBy('total_amount', 'desc')
            ->get();

        // Detail list
        $detail = DB::connection('tenant')->table('expenses')
            ->join('expense_categories', 'expenses.category_id', '=', 'expense_categories.id')
            ->leftJoin('safes', 'expenses.safe_id', '=', 'safes.id')
            ->leftJoin('users', 'expenses.created_by', '=', 'users.id')
            ->where('expenses.tenant_id', $tenantId)
            ->whereBetween('expenses.expense_date', [$from, $to])
            ->whereNull('expenses.deleted_at')
            ->when($categoryId, fn($q) => $q->where('expenses.category_id', $categoryId))
            ->when($safeId, fn($q) => $q->where('expenses.safe_id', $safeId))
            ->select(
                'expenses.id',
                'expenses.expense_date',
                'expense_categories.name as category',
                'safes.name as safe_name',
                'expenses.amount',
                'expenses.description',
                DB::raw("COALESCE(users.name, '') as created_by_name")
            )
            ->orderBy('expenses.expense_date', 'desc')
            ->get();

        $totalAmount  = $detail->sum('amount');
        $salaryAmount = $byCategory->where('is_advance_or_salary', true)->sum('total_amount');
        $opsAmount    = $byCategory->where('is_advance_or_salary', false)->sum('total_amount');

        return $this->success([
            'period'          => ['from' => $from, 'to' => $to],
            'by_category'     => $byCategory,
            'expenses'        => $detail,
            'total_amount'    => round($totalAmount, 2),
            'salary_advance'  => round($salaryAmount, 2),
            'operational'     => round($opsAmount, 2),
            'expense_count'   => $detail->count(),
        ]);
    }
}
