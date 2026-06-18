<?php

namespace App\Application\Reports\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ReportingService
{
    public function __construct(
        private readonly string $tenantId
    ) {}

    public function getProfitAndLoss(string $startDate, string $endDate): array
    {
        // Revenues: Total confirmed sales invoices
        $totalSales = DB::connection('tenant')->table('invoices')->where('tenant_id', $this->tenantId)
            ->where('status', 'confirmed')
            ->whereBetween('invoice_date', [$startDate, $endDate])
            ->sum('total');

        // Expenses: Safe transactions of type 'withdrawal' for expenses
        $totalExpenses = DB::connection('tenant')->table('expenses')->where('tenant_id', $this->tenantId)
            ->whereBetween('expense_date', [$startDate, $endDate])
            ->sum('amount');

        // Purchases: Total confirmed purchase invoices
        $totalPurchases = DB::connection('tenant')->table('purchase_invoices')->where('tenant_id', $this->tenantId)
            ->where('status', 'confirmed')
            ->whereBetween('invoice_date', [$startDate, $endDate])
            ->sum('total');

        // Calculation
        $grossProfit = $totalSales - $totalPurchases; // Over-simplified COGS
        $netIncome = $grossProfit - $totalExpenses;

        return [
            'revenues' => [
                'sales' => (float) $totalSales,
            ],
            'expenses' => [
                'operating_expenses' => (float) $totalExpenses,
                'purchases' => (float) $totalPurchases,
            ],
            'net_income' => (float) $netIncome,
            'period' => [
                'start' => $startDate,
                'end' => $endDate,
            ],
        ];
    }

    public function getVatReport(string $year, string $period, string $value): array
    {
        $querySales = DB::connection('tenant')->table('invoices')->where('tenant_id', $this->tenantId)->where('status', 'confirmed');
        $queryPurchases = DB::connection('tenant')->table('purchase_invoices')->where('tenant_id', $this->tenantId)->where('status', 'confirmed');

        if ($period === 'monthly') {
            $querySales->whereYear('invoice_date', $year)->whereMonth('invoice_date', $value);
            $queryPurchases->whereYear('invoice_date', $year)->whereMonth('invoice_date', $value);
        } else {
            $months = match ($value) {
                'Q1' => [1, 2, 3],
                'Q2' => [4, 5, 6],
                'Q3' => [7, 8, 9],
                'Q4' => [10, 11, 12],
                default => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
            };
            $querySales->whereYear('invoice_date', $year)->whereIn(DB::raw('EXTRACT(MONTH FROM invoice_date)'), $months);
            $queryPurchases->whereYear('invoice_date', $year)->whereIn(DB::raw('EXTRACT(MONTH FROM invoice_date)'), $months);
        }

        $salesVat = (float) $querySales->sum('vat_amount');
        $salesExempt = (float) $querySales->where('vat_amount', 0)->sum('total');
        $salesStandard = (float) $querySales->where('vat_amount', '>', 0)->sum('subtotal');

        $purchasesVat = (float) $queryPurchases->sum('vat_amount');
        $purchasesStandard = (float) $queryPurchases->where('vat_amount', '>', 0)->sum('subtotal');

        return [
            'sales' => $salesStandard,
            'exemptSales' => $salesExempt,
            'outputVat' => $salesVat,
            'purchases' => $purchasesStandard,
            'inputVat' => $purchasesVat,
            'netVatPayable' => $salesVat - $purchasesVat,
        ];
    }

    public function getInventoryReport(array $filters = []): array
    {
        try {
            // Total items
            $totalItems = DB::connection('tenant')->table('products')->where('tenant_id', $this->tenantId)->count();

            // Total stock quantity & financial valuation (qty * average_cost)
            $inventoryValue = DB::connection('tenant')->table('products')->where('tenant_id', $this->tenantId)
                ->selectRaw('SUM(stock_quantity * price) as total_value')
                ->first()
                ->total_value ?? 0;

            $lowStockItems = DB::connection('tenant')->table('products')->where('tenant_id', $this->tenantId)
                ->where('stock_quantity', '<=', 5) // Hardcoded threshold for now
                ->take(10)
                ->get();
        } catch (\Exception $e) {
            $totalItems = 0;
            $inventoryValue = 0;
            $lowStockItems = [];
        }

        return [
            'total_items' => $totalItems,
            'estimated_inventory_value' => (float) $inventoryValue,
            'low_stock_alerts' => $lowStockItems,
        ];
    }

    public function getAccountsReport(): array
    {
        $safes = DB::connection('tenant')->table('safes')->where('tenant_id', $this->tenantId)->get();
        $totalLiquidity = $safes->sum('balance');

        // Recent deposits and withdrawals
        $recentTransactions = DB::connection('tenant')->table('safe_transactions')->where('tenant_id', $this->tenantId)
            ->orderBy('transaction_date', 'desc')
            ->take(20)
            ->get();

        return [
            'safes' => $safes,
            'total_liquidity' => (float) $totalLiquidity,
            'recent_transactions' => $recentTransactions,
        ];
    }

    public function getGeneralKpis(): array
    {
        // Totals
        $totalSales = DB::connection('tenant')->table('invoices')->where('tenant_id', $this->tenantId)->where('status', 'confirmed')->sum('total');
        $totalPurchases = DB::connection('tenant')->table('purchase_invoices')->where('tenant_id', $this->tenantId)->where('status', 'confirmed')->sum('total');
        $totalExpenses = DB::connection('tenant')->table('expenses')->where('tenant_id', $this->tenantId)->sum('amount');

        $totalProducts = DB::connection('tenant')->table('products')->where('tenant_id', $this->tenantId)->count();
        $totalCustomers = DB::connection('tenant')->table('customers')->where('tenant_id', $this->tenantId)->count();

        // Financial Distribution (Pie Chart)
        $assets = DB::connection('tenant')->table('safes')->where('tenant_id', $this->tenantId)->sum('balance') + DB::connection('tenant')->table('customers')->where('tenant_id', $this->tenantId)->sum('balance');
        $liabilities = DB::connection('tenant')->table('suppliers')->where('tenant_id', $this->tenantId)->sum('balance');
        $equity = max(0, $assets - $liabilities);

        // Top Products (by sales count)
        $topProducts = DB::connection('tenant')->table('invoice_items')->where('tenant_id', $this->tenantId)
            ->select('product_id', DB::raw('SUM(quantity) as total_sold'))
            ->groupBy('product_id')
            ->orderBy('total_sold', 'desc')
            ->take(5)
            ->get();

        foreach ($topProducts as $tp) {
            $prod = DB::connection('tenant')->table('products')->where('tenant_id', $this->tenantId)->where('id', $tp->product_id)->first();
            $tp->name = $prod->name ?? 'Product '.substr($tp->product_id, 0, 8);
            $tp->name_ar = $prod->name_ar ?? $tp->name;
            $tp->oem_number = $prod->oem_number ?? null;
            $tp->part_number = $prod->part_number ?? null;
            $tp->brand = $prod->brand ?? null;
        }

        // Dead Stock (Products with zero sales or no sales in the last 6 months)
        $soldProductIds = DB::connection('tenant')->table('invoice_items')
            ->where('tenant_id', $this->tenantId)
            ->distinct()
            ->pluck('product_id')
            ->toArray();

        // Get products not in sold items, but have stock in warehouse
        $deadStock = DB::connection('tenant')->table('warehouse_products')
            ->where('warehouse_products.tenant_id', $this->tenantId)
            ->where('warehouse_products.quantity', '>', 0)
            ->whereNotIn('warehouse_products.product_id', $soldProductIds)
            ->join('products', 'warehouse_products.product_id', '=', 'products.id')
            ->select('products.id', 'products.name', 'products.name_ar', 'products.oem_number', 'products.part_number', 'products.brand', DB::raw('SUM(warehouse_products.quantity) as total_stock'), DB::raw('SUM(warehouse_products.quantity * warehouse_products.average_cost) as total_value'))
            ->groupBy('products.id', 'products.name', 'products.name_ar', 'products.oem_number', 'products.part_number', 'products.brand')
            ->orderBy('total_value', 'desc')
            ->take(5)
            ->get();

        // Top Customers (by sales total)
        $topCustomers = DB::connection('tenant')->table('invoices')->where('tenant_id', $this->tenantId)
            ->where('status', 'confirmed')
            ->select('customer_id', DB::raw('SUM(total) as total_spent'), DB::raw('COUNT(id) as orders_count'))
            ->whereNotNull('customer_id')
            ->groupBy('customer_id')
            ->orderBy('total_spent', 'desc')
            ->take(5)
            ->get();

        foreach ($topCustomers as $tc) {
            $cust = DB::connection('tenant')->table('customers')->where('tenant_id', $this->tenantId)->where('id', $tc->customer_id)->first();
            $tc->name = $cust->name ?? 'Cash Customer';
            $tc->name_ar = $cust->name_ar ?? $tc->name;
        }

        // Daily sales trend for chart
        $dailySales = DB::connection('tenant')->table('invoices')->where('tenant_id', $this->tenantId)
            ->where('status', 'confirmed')
            ->where('invoice_date', '>=', now()->subDays(30))
            ->select(DB::raw('DATE(invoice_date) as date'), DB::raw('SUM(total) as revenue'))
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        return [
            'summary' => [
                'total_sales' => (float) $totalSales,
                'total_purchases' => (float) $totalPurchases,
                'total_products' => $totalProducts,
                'total_customers' => $totalCustomers,
                'revenue' => (float) $totalSales,
                'expenses' => (float) $totalExpenses,
                'net_income' => (float) ($totalSales - $totalPurchases - $totalExpenses),
            ],
            'daily_sales' => $dailySales,
            'accounts_distribution' => [
                'assets' => (float) $assets,
                'liabilities' => (float) $liabilities,
                'equity' => (float) $equity,
            ],
            'top_products' => $topProducts,
            'top_customers' => $topCustomers,
            'dead_stock' => $deadStock,
            
            // SMACC-like Financial Features
            'vat_summary' => $this->getVatReport(date('Y'), 'monthly', date('m')),
            'receivables_aging' => $this->getAgingReport('receivable')['totals'] ?? [],
            'payables_aging' => $this->getAgingReport('payable')['totals'] ?? [],
            'liquidity' => [
                'total' => $this->getAccountsReport()['total_liquidity'] ?? 0,
                'safes' => $this->getAccountsReport()['safes'] ?? []
            ],
            'pending_tasks' => $this->getPendingTasks(),
            'gross_margin' => $this->getGrossMargin(),
            'top_sales_reps' => $this->getTopSalesReps(),
            'live_audit_trail' => $this->getLiveAuditTrail(),
            'expenses_breakdown' => $this->getExpensesBreakdown(),
        ];
    }

    public function getPendingTasks(): array
    {
        $draftInvoices = DB::connection('tenant')->table('invoices')->where('tenant_id', $this->tenantId)->where('status', 'draft')->count();
        $draftPurchases = DB::connection('tenant')->table('purchase_invoices')->where('tenant_id', $this->tenantId)->where('status', 'draft')->count();
        $unpostedJournals = DB::connection('tenant')->table('journal_entries')->where('tenant_id', $this->tenantId)->where('is_posted', false)->count();

        return [
            'draft_invoices' => $draftInvoices,
            'draft_purchases' => $draftPurchases,
            'unposted_journals' => $unpostedJournals,
            'total_pending' => $draftInvoices + $draftPurchases + $unpostedJournals,
        ];
    }

    public function getGrossMargin(): array
    {
        $startDate = now()->startOfMonth()->toDateString();
        $endDate = now()->endOfMonth()->toDateString();

        $revenue = DB::connection('tenant')->table('invoices')
            ->where('tenant_id', $this->tenantId)
            ->where('status', 'confirmed')
            ->whereBetween('invoice_date', [$startDate, $endDate])
            ->sum('total');

        // Estimate COGS by fetching the sum of products' cost price * sold quantity
        $cogs = DB::connection('tenant')->table('invoice_items')
            ->join('invoices', 'invoice_items.invoice_id', '=', 'invoices.id')
            ->join('products', 'invoice_items.product_id', '=', 'products.id')
            ->where('invoices.tenant_id', $this->tenantId)
            ->where('invoices.status', 'confirmed')
            ->whereBetween('invoices.invoice_date', [$startDate, $endDate])
            ->sum(DB::raw('invoice_items.quantity * products.cost_price'));

        $revenueFloat = (float) $revenue;
        $cogsFloat = (float) $cogs;
        $grossMarginAmount = $revenueFloat - $cogsFloat;
        $grossMarginPercent = $revenueFloat > 0 ? ($grossMarginAmount / $revenueFloat) * 100 : 0;

        return [
            'revenue' => $revenueFloat,
            'cogs' => $cogsFloat,
            'gross_margin_amount' => $grossMarginAmount,
            'gross_margin_percent' => round($grossMarginPercent, 2),
        ];
    }

    public function getTopSalesReps(): array
    {
        $startDate = now()->startOfMonth()->toDateString();
        $endDate = now()->endOfMonth()->toDateString();

        $reps = DB::connection('tenant')->table('invoices')
            ->where('invoices.tenant_id', $this->tenantId)
            ->where('invoices.status', 'confirmed')
            ->whereBetween('invoices.invoice_date', [$startDate, $endDate])
            ->select('created_by', DB::raw('SUM(total) as total_sales'), DB::raw('COUNT(id) as invoices_count'))
            ->whereNotNull('created_by')
            ->groupBy('created_by')
            ->orderBy('total_sales', 'desc')
            ->take(5)
            ->get();

        foreach ($reps as $rep) {
            $user = DB::connection('central')->table('users')->where('id', $rep->created_by)->first();
            $rep->name = $user->name ?? 'Unknown User';
        }

        return $reps->toArray();
    }

    public function getLiveAuditTrail(): array
    {
        try {
            $logs = DB::connection('tenant')->table('activity_logs')
                ->orderBy('created_at', 'desc')
                ->take(10)
                ->get();

            foreach ($logs as $log) {
                if ($log->user_id) {
                    $user = DB::connection('central')->table('users')->where('id', $log->user_id)->first();
                    $log->user_name = $user->name ?? 'System';
                } else {
                    $log->user_name = 'System';
                }
            }
            return $logs->toArray();
        } catch (\Exception $e) {
            // Table might not exist yet if migration isn't run, fallback to empty
            return [];
        }
    }

    public function getExpensesBreakdown(): array
    {
        $startDate = now()->startOfMonth()->toDateString();
        $endDate = now()->endOfMonth()->toDateString();

        try {
            $expenses = DB::connection('tenant')->table('expenses')
                ->where('expenses.tenant_id', $this->tenantId)
                ->whereBetween('expenses.expense_date', [$startDate, $endDate])
                ->join('expense_categories', 'expenses.category_id', '=', 'expense_categories.id')
                ->select('expense_categories.name', 'expense_categories.name_ar', DB::raw('SUM(expenses.amount) as total_amount'))
                ->groupBy('expense_categories.id', 'expense_categories.name', 'expense_categories.name_ar')
                ->orderBy('total_amount', 'desc')
                ->get();

            return $expenses->toArray();
        } catch (\Exception $e) {
            return [];
        }
    }

    public function getAgingReport(string $type): array
    {
        $now = now();

        if ($type === 'receivable') {
            $entities = DB::connection('tenant')->table('customers')->where('tenant_id', $this->tenantId)
                ->where('balance', '>', 0)
                ->get();

            $report = [];
            $totals = ['0_30' => 0, '31_60' => 0, '61_90' => 0, 'over_90' => 0, 'total' => 0];

            foreach ($entities as $customer) {
                // Fetch credit invoices for this customer ordered by date desc
                $invoices = DB::connection('tenant')->table('invoices')->where('tenant_id', $this->tenantId)
                    ->where('customer_id', $customer->id)
                    ->where('type', 'credit')
                    ->where('status', 'confirmed')
                    ->orderBy('invoice_date', 'asc')
                    ->get();

                $balanceRemaining = (float) $customer->balance;

                $buckets = ['0_30' => 0, '31_60' => 0, '61_90' => 0, 'over_90' => 0];

                // Distribute the balance over the oldest invoices first
                foreach ($invoices as $invoice) {
                    if ($balanceRemaining <= 0) {
                        break;
                    }

                    $amount = min($balanceRemaining, (float) $invoice->total);
                    $balanceRemaining -= $amount;

                    $dueDateStr = $invoice->due_date ?? $invoice->invoice_date;
                    $dueDate = Carbon::parse($dueDateStr);

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
                    'total_balance' => (float) $customer->balance,
                    'buckets' => $buckets,
                ];

                $totals['0_30'] += $buckets['0_30'];
                $totals['31_60'] += $buckets['31_60'];
                $totals['61_90'] += $buckets['61_90'];
                $totals['over_90'] += $buckets['over_90'];
                $totals['total'] += (float) $customer->balance;
            }

            return ['data' => $report, 'totals' => $totals, 'type' => 'receivable'];
        } else {
            // Payable (Suppliers)
            $entities = DB::connection('tenant')->table('suppliers')->where('tenant_id', $this->tenantId)
                ->where('balance', '>', 0)
                ->get();

            $report = [];
            $totals = ['0_30' => 0, '31_60' => 0, '61_90' => 0, 'over_90' => 0, 'total' => 0];

            foreach ($entities as $supplier) {
                // Fetch credit invoices for this supplier ordered by date desc
                $invoices = DB::connection('tenant')->table('purchase_invoices')->where('tenant_id', $this->tenantId)
                    ->where('supplier_id', $supplier->id)
                    ->where('status', 'confirmed')
                    ->orderBy('invoice_date', 'asc')
                    ->get();

                $balanceRemaining = (float) $supplier->balance;

                $buckets = ['0_30' => 0, '31_60' => 0, '61_90' => 0, 'over_90' => 0];

                foreach ($invoices as $invoice) {
                    if ($balanceRemaining <= 0) {
                        break;
                    }

                    $amount = min($balanceRemaining, (float) $invoice->total);
                    $balanceRemaining -= $amount;

                    $dueDateStr = $invoice->due_date ?? $invoice->invoice_date;
                    $dueDate = Carbon::parse($dueDateStr);

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
                    'total_balance' => (float) $supplier->balance,
                    'buckets' => $buckets,
                ];

                $totals['0_30'] += $buckets['0_30'];
                $totals['31_60'] += $buckets['31_60'];
                $totals['61_90'] += $buckets['61_90'];
                $totals['over_90'] += $buckets['over_90'];
                $totals['total'] += (float) $supplier->balance;
            }

            return ['data' => $report, 'totals' => $totals, 'type' => 'payable'];
        }
    }
}
