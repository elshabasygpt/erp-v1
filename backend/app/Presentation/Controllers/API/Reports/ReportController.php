<?php

namespace App\Presentation\Controllers\API\Reports;

use App\Presentation\Controllers\API\BaseController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends BaseController
{
    /**
     * Profit & Loss Report
     */
    public function getProfitAndLoss(Request $request)
    {
        $startDate = $request->query('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->query('end_date', now()->toDateString());

        // Revenues: Total confirmed sales invoices
        $totalSales = DB::connection('tenant')->table('invoices')
            ->where('status', 'confirmed')
            ->whereBetween('invoice_date', [$startDate, $endDate])
            ->sum('total');

        // Expenses: Safe transactions of type 'withdrawal' for expenses
        $totalExpenses = DB::connection('tenant')->table('expenses')
            ->whereBetween('expense_date', [$startDate, $endDate])
            ->sum('amount');
        
        // Purchases: Total confirmed purchase invoices
        $totalPurchases = DB::connection('tenant')->table('purchase_invoices')
            ->where('status', 'confirmed')
            ->whereBetween('invoice_date', [$startDate, $endDate])
            ->sum('total');

        // Calculation
        $grossProfit = $totalSales - $totalPurchases; // Over-simplified COGS
        $netIncome = $grossProfit - $totalExpenses;

        return $this->success([
            'revenues' => [
                'sales' => (float)$totalSales,
            ],
            'expenses' => [
                'operating_expenses' => (float)$totalExpenses,
                'purchases' => (float)$totalPurchases
            ],
            'net_income' => (float)$netIncome,
            'period' => [
                'start' => $startDate,
                'end' => $endDate
            ]
        ]);
    }

    /**
     * VAT / ZATCA Report
     */
    public function getVatReport(Request $request)
    {
        $year = $request->query('year', date('Y'));
        $period = $request->query('period', 'monthly'); // monthly, quarterly
        $value = $request->query('value', date('m')); // 01-12 or Q1-Q4

        $querySales = DB::connection('tenant')->table('invoices')->where('status', 'confirmed');
        $queryPurchases = DB::connection('tenant')->table('purchase_invoices')->where('status', 'confirmed');

        if ($period === 'monthly') {
            $querySales->whereYear('invoice_date', $year)->whereMonth('invoice_date', $value);
            $queryPurchases->whereYear('invoice_date', $year)->whereMonth('invoice_date', $value);
        } else {
            $months = match($value) {
                'Q1' => [1, 2, 3],
                'Q2' => [4, 5, 6],
                'Q3' => [7, 8, 9],
                'Q4' => [10, 11, 12],
                default => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
            };
            $querySales->whereYear('invoice_date', $year)->whereIn(DB::raw('EXTRACT(MONTH FROM invoice_date)'), $months);
            $queryPurchases->whereYear('invoice_date', $year)->whereIn(DB::raw('EXTRACT(MONTH FROM invoice_date)'), $months);
        }

        $salesVat = (float)$querySales->sum('vat_amount');
        $salesExempt = (float)$querySales->where('vat_amount', 0)->sum('total');
        $salesStandard = (float)$querySales->where('vat_amount', '>', 0)->sum('subtotal');

        $purchasesVat = (float)$queryPurchases->sum('vat_amount');
        $purchasesStandard = (float)$queryPurchases->where('vat_amount', '>', 0)->sum('subtotal');

        return $this->success([
            'sales' => $salesStandard,
            'exemptSales' => $salesExempt,
            'outputVat' => $salesVat,
            'purchases' => $purchasesStandard,
            'inputVat' => $purchasesVat,
            'netVatPayable' => $salesVat - $purchasesVat
        ]);
    }

    /**
     * Inventory Valuation Report
     */
    public function getInventoryReport(Request $request)
    {
        try {
            // Total items
            $totalItems = DB::connection('tenant')->table('products')->count();

            // Total stock quantity & financial valuation (qty * average_cost)
            $inventoryValue = DB::connection('tenant')->table('products')
                ->selectRaw('SUM(stock_quantity * price) as total_value')
                ->first()
                ->total_value ?? 0;

            $lowStockItems = DB::connection('tenant')->table('products')
                ->where('stock_quantity', '<=', 5) // Hardcoded threshold for now
                ->take(10)
                ->get();
        } catch (\Exception $e) {
            $totalItems = 0;
            $inventoryValue = 0;
            $lowStockItems = [];
        }

        return $this->success([
            'total_items' => $totalItems,
            'estimated_inventory_value' => (float)$inventoryValue,
            'low_stock_alerts' => $lowStockItems
        ]);
    }

    /**
     * Treasury & Accounts Report
     */
    public function getAccountsReport(Request $request)
    {
        $safes = DB::connection('tenant')->table('safes')->get();
        $totalLiquidity = $safes->sum('balance');

        // Recent deposits and withdrawals
        $recentTransactions = DB::connection('tenant')->table('safe_transactions')
            ->orderBy('transaction_date', 'desc')
            ->take(20)
            ->get();

        return $this->success([
            'safes' => $safes,
            'total_liquidity' => (float)$totalLiquidity,
            'recent_transactions' => $recentTransactions
        ]);
    }

    /**
     * General Dashboard KPI (Entities count)
     */
    public function getGeneralKpis(Request $request)
    {
        // Totals
        $totalSales = DB::connection('tenant')->table('invoices')->where('status', 'confirmed')->sum('total');
        $totalPurchases = DB::connection('tenant')->table('purchase_invoices')->where('status', 'confirmed')->sum('total');
        $totalExpenses = DB::connection('tenant')->table('expenses')->sum('amount');
        
        $totalProducts = DB::connection('tenant')->table('products')->count();
        $totalCustomers = DB::connection('tenant')->table('customers')->count();

        // Financial Distribution (Pie Chart)
        $assets = DB::connection('tenant')->table('safes')->sum('balance') + DB::connection('tenant')->table('customers')->sum('balance');
        $liabilities = DB::connection('tenant')->table('suppliers')->sum('balance');
        $equity = max(0, $assets - $liabilities);

        // Top Products (by sales count)
        $topProducts = DB::connection('tenant')->table('invoice_items')
            ->select('product_id', DB::raw('SUM(quantity) as total_sold'))
            ->groupBy('product_id')
            ->orderBy('total_sold', 'desc')
            ->take(5)
            ->get();
        
        foreach ($topProducts as $tp) {
            $prod = DB::connection('tenant')->table('products')->where('id', $tp->product_id)->first();
            $tp->name = $prod->name ?? 'Product ' . substr($tp->product_id, 0, 8);
            $tp->name_ar = $prod->name_ar ?? $tp->name;
        }

        // Top Customers (by sales total)
        $topCustomers = DB::connection('tenant')->table('invoices')
            ->where('status', 'confirmed')
            ->select('customer_id', DB::raw('SUM(total) as total_spent'), DB::raw('COUNT(id) as orders_count'))
            ->whereNotNull('customer_id')
            ->groupBy('customer_id')
            ->orderBy('total_spent', 'desc')
            ->take(5)
            ->get();

        foreach ($topCustomers as $tc) {
            $cust = DB::connection('tenant')->table('customers')->where('id', $tc->customer_id)->first();
            $tc->name = $cust->name ?? 'Cash Customer';
            $tc->name_ar = $cust->name_ar ?? $tc->name;
        }

        // Daily sales trend for chart
        $dailySales = DB::connection('tenant')->table('invoices')
            ->where('status', 'confirmed')
            ->where('invoice_date', '>=', now()->subDays(30))
            ->select(DB::raw('DATE(invoice_date) as date'), DB::raw('SUM(total) as revenue'))
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        return $this->success([
            'summary' => [
                'total_sales' => (float)$totalSales,
                'total_purchases' => (float)$totalPurchases,
                'total_products' => $totalProducts,
                'total_customers' => $totalCustomers,
                'revenue' => (float)$totalSales,
                'expenses' => (float)$totalExpenses,
                'net_income' => (float)($totalSales - $totalPurchases - $totalExpenses),
            ],
            'daily_sales' => $dailySales,
            'accounts_distribution' => [
                'assets' => (float)$assets,
                'liabilities' => (float)$liabilities,
                'equity' => (float)$equity,
            ],
            'top_products' => $topProducts,
            'top_customers' => $topCustomers,
        ]);
    }

    /**
     * Aging Report (أعمار الديون)
     * Calculates Accounts Receivable (Customers) and Accounts Payable (Suppliers) aging.
     */
    public function getAgingReport(Request $request)
    {
        $type = $request->query('type', 'receivable'); // 'receivable' or 'payable'
        
        $now = now();
        
        if ($type === 'receivable') {
            $entities = DB::connection('tenant')->table('customers')
                ->where('balance', '>', 0)
                ->get();
            
            $report = [];
            $totals = ['0_30' => 0, '31_60' => 0, '61_90' => 0, 'over_90' => 0, 'total' => 0];

            foreach ($entities as $customer) {
                // Fetch credit invoices for this customer ordered by date desc
                $invoices = DB::connection('tenant')->table('invoices')
                    ->where('customer_id', $customer->id)
                    ->where('type', 'credit')
                    ->where('status', 'confirmed')
                    ->orderBy('invoice_date', 'asc')
                    ->get();
                
                $balanceRemaining = (float)$customer->balance;
                
                $buckets = ['0_30' => 0, '31_60' => 0, '61_90' => 0, 'over_90' => 0];

                // Distribute the balance over the oldest invoices first
                foreach ($invoices as $invoice) {
                    if ($balanceRemaining <= 0) break;

                    $amount = min($balanceRemaining, (float)$invoice->total);
                    $balanceRemaining -= $amount;

                    $dueDateStr = $invoice->due_date ?? $invoice->invoice_date;
                    $dueDate = \Carbon\Carbon::parse($dueDateStr);
                    
                    if ($now->lessThanOrEqualTo($dueDate)) {
                        continue; // Not overdue yet
                    }
                    
                    $days = $now->diffInDays($dueDate);

                    if ($days <= 30) {
                        $buckets['0_30'] += $amount;
                    } elseif ($days <= 60) {
                        $buckets['31_60'] += $amount;
                    } elseif ($days <= 90) {
                        $buckets['61_90'] += $amount;
                    } else {
                        $buckets['over_90'] += $amount;
                    }
                }

                // If there's still balance remaining (maybe opening balance without invoices)
                if ($balanceRemaining > 0) {
                    $buckets['over_90'] += $balanceRemaining; // Default to oldest
                }

                $report[] = [
                    'id' => $customer->id,
                    'name' => $customer->name,
                    'name_ar' => $customer->name_ar,
                    'total_balance' => (float)$customer->balance,
                    'buckets' => $buckets
                ];

                $totals['0_30'] += $buckets['0_30'];
                $totals['31_60'] += $buckets['31_60'];
                $totals['61_90'] += $buckets['61_90'];
                $totals['over_90'] += $buckets['over_90'];
                $totals['total'] += (float)$customer->balance;
            }

            return $this->success(['data' => $report, 'totals' => $totals, 'type' => 'receivable']);
        } else {
            // Payable (Suppliers)
            $entities = DB::connection('tenant')->table('suppliers')
                ->where('balance', '>', 0)
                ->get();
            
            $report = [];
            $totals = ['0_30' => 0, '31_60' => 0, '61_90' => 0, 'over_90' => 0, 'total' => 0];

            foreach ($entities as $supplier) {
                // Fetch credit invoices for this supplier ordered by date desc
                $invoices = DB::connection('tenant')->table('purchase_invoices')
                    ->where('supplier_id', $supplier->id)
                    ->where('status', 'confirmed')
                    ->orderBy('invoice_date', 'asc')
                    ->get();
                
                $balanceRemaining = (float)$supplier->balance;
                
                $buckets = ['0_30' => 0, '31_60' => 0, '61_90' => 0, 'over_90' => 0];

                foreach ($invoices as $invoice) {
                    if ($balanceRemaining <= 0) break;

                    $amount = min($balanceRemaining, (float)$invoice->total);
                    $balanceRemaining -= $amount;

                    $dueDateStr = $invoice->due_date ?? $invoice->invoice_date;
                    $dueDate = \Carbon\Carbon::parse($dueDateStr);
                    
                    if ($now->lessThanOrEqualTo($dueDate)) {
                        continue; // Not overdue yet
                    }
                    
                    $days = $now->diffInDays($dueDate);

                    if ($days <= 30) {
                        $buckets['0_30'] += $amount;
                    } elseif ($days <= 60) {
                        $buckets['31_60'] += $amount;
                    } elseif ($days <= 90) {
                        $buckets['61_90'] += $amount;
                    } else {
                        $buckets['over_90'] += $amount;
                    }
                }

                if ($balanceRemaining > 0) {
                    $buckets['over_90'] += $balanceRemaining; 
                }

                $report[] = [
                    'id' => $supplier->id,
                    'name' => $supplier->name,
                    'name_ar' => $supplier->name_ar,
                    'total_balance' => (float)$supplier->balance,
                    'buckets' => $buckets
                ];

                $totals['0_30'] += $buckets['0_30'];
                $totals['31_60'] += $buckets['31_60'];
                $totals['61_90'] += $buckets['61_90'];
                $totals['over_90'] += $buckets['over_90'];
                $totals['total'] += (float)$supplier->balance;
            }

            return $this->success(['data' => $report, 'totals' => $totals, 'type' => 'payable']);
        }
    }
}
