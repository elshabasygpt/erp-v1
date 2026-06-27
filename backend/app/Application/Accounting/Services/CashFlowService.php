<?php

declare(strict_types=1);

namespace App\Application\Accounting\Services;

use App\Domain\Accounting\Services\AccountMappingService;
use Illuminate\Support\Facades\DB;

final class CashFlowService
{
    /**
     * reference_type → cash flow category map.
     * Operating: day-to-day business transactions.
     * Investing: long-term asset transactions.
     * Financing: debt/equity transactions.
     */
    private const REFERENCE_CATEGORY_MAP = [
        // Operating
        'sales_invoice'      => 'operating',
        'customer_payment'   => 'operating',
        'purchase_invoice'   => 'operating',
        'supplier_payment'   => 'operating',
        'expense'            => 'operating',
        'expense_voucher'    => 'operating',
        'sales_return'       => 'operating',
        'purchase_return'    => 'operating',
        'credit_note'        => 'operating',
        'inventory'          => 'operating',
        'zakat'              => 'operating',
        'payroll'            => 'operating',
        // Investing
        'fixed_asset'        => 'investing',
        'fixed_asset_purchase'  => 'investing',
        'fixed_asset_disposal'  => 'investing',
        'asset_depreciation' => 'investing',
        // Financing
        'loan'               => 'financing',
        'loan_repayment'     => 'financing',
        'equity_injection'   => 'financing',
        'dividend'           => 'financing',
        'bank_transfer'      => 'financing',
    ];

    // Human-readable labels (Arabic + English)
    private const LABELS = [
        'sales_invoice'         => 'إيرادات المبيعات / Sales Revenue',
        'customer_payment'      => 'مدفوعات العملاء / Customer Receipts',
        'purchase_invoice'      => 'مشتريات / Purchases',
        'supplier_payment'      => 'مدفوعات الموردين / Supplier Payments',
        'expense'               => 'مصروفات / Expenses',
        'expense_voucher'       => 'سندات صرف / Expense Vouchers',
        'sales_return'          => 'مردودات مبيعات / Sales Returns',
        'purchase_return'       => 'مردودات مشتريات / Purchase Returns',
        'credit_note'           => 'إشعارات دائنة / Credit Notes',
        'inventory'             => 'مخزون / Inventory Adjustments',
        'zakat'                 => 'زكاة / Zakat',
        'payroll'               => 'رواتب / Payroll',
        'fixed_asset'           => 'أصول ثابتة / Fixed Assets',
        'fixed_asset_purchase'  => 'شراء أصول / Asset Purchase',
        'fixed_asset_disposal'  => 'بيع أصول / Asset Disposal',
        'asset_depreciation'    => 'إهلاك / Depreciation',
        'loan'                  => 'قروض / Loans',
        'loan_repayment'        => 'سداد قروض / Loan Repayments',
        'equity_injection'      => 'رأس مال / Capital Injection',
        'dividend'              => 'أرباح موزعة / Dividends',
        'bank_transfer'         => 'تحويلات بنكية / Bank Transfers',
        'other'                 => 'أخرى / Other',
        'reversal'              => 'قيود عكسية / Reversals',
        'fx_revaluation'        => 'فروق عملة / FX Revaluation',
    ];

    public function __construct(
        private readonly AccountMappingService $accountMapping
    ) {}

    public function generateCashFlowStatement(\DateTimeImmutable $from, \DateTimeImmutable $to, string $tenantId): array
    {
        $cashAccountId = $this->accountMapping->resolve('cash');
        $bankAccountId = $this->accountMapping->resolve('bank');
        $cashAccounts  = array_unique([$cashAccountId, $bankAccountId]);

        // Fetch all GL lines that hit cash/bank accounts in the period
        $cashLines = DB::connection('tenant')->table('journal_entry_lines')
            ->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
            ->where('journal_entries.tenant_id', $tenantId)
            ->whereIn('journal_entry_lines.account_id', $cashAccounts)
            ->where('journal_entries.is_posted', 1)
            ->whereBetween('journal_entries.date', [$from->format('Y-m-d'), $to->format('Y-m-d')])
            ->selectRaw(
                'journal_entries.reference_type,
                 SUM(journal_entry_lines.debit) as inflow,
                 SUM(journal_entry_lines.credit) as outflow'
            )
            ->groupBy('journal_entries.reference_type')
            ->orderBy('journal_entries.reference_type')
            ->get();

        // Opening cash balance (before period)
        $openingBalance = DB::connection('tenant')->table('journal_entry_lines')
            ->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
            ->where('journal_entries.tenant_id', $tenantId)
            ->whereIn('journal_entry_lines.account_id', $cashAccounts)
            ->where('journal_entries.is_posted', 1)
            ->where('journal_entries.date', '<', $from->format('Y-m-d'))
            ->selectRaw('COALESCE(SUM(debit) - SUM(credit), 0) as balance')
            ->value('balance') ?? 0;

        $operating  = [];
        $investing  = [];
        $financing  = [];

        $operatingNet = 0.0;
        $investingNet = 0.0;
        $financingNet = 0.0;

        foreach ($cashLines as $row) {
            $refType = $row->reference_type ?? 'other';
            $inflow  = (float) $row->inflow;
            $outflow = (float) $row->outflow;
            $net     = $inflow - $outflow;

            $category = self::REFERENCE_CATEGORY_MAP[$refType] ?? 'operating';
            $label    = self::LABELS[$refType] ?? $refType;

            $item = [
                'reference_type' => $refType,
                'label'          => $label,
                'inflow'         => round($inflow, 2),
                'outflow'        => round($outflow, 2),
                'net'            => round($net, 2),
            ];

            if ($category === 'investing') {
                $investing[]  = $item;
                $investingNet += $net;
            } elseif ($category === 'financing') {
                $financing[]  = $item;
                $financingNet += $net;
            } else {
                $operating[]  = $item;
                $operatingNet += $net;
            }
        }

        $netCashFlow   = $operatingNet + $investingNet + $financingNet;
        $closingBalance = (float) $openingBalance + $netCashFlow;

        return [
            'period' => [
                'from' => $from->format('Y-m-d'),
                'to'   => $to->format('Y-m-d'),
            ],
            'opening_cash_balance'  => round((float) $openingBalance, 2),
            'operating_activities'  => [
                'items' => $operating,
                'total' => round($operatingNet, 2),
            ],
            'investing_activities'  => [
                'items' => $investing,
                'total' => round($investingNet, 2),
            ],
            'financing_activities'  => [
                'items' => $financing,
                'total' => round($financingNet, 2),
            ],
            'net_cash_flow'         => round($netCashFlow, 2),
            'closing_cash_balance'  => round($closingBalance, 2),
        ];
    }
}
