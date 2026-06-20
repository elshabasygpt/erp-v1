<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Portal;

use App\Domain\Partnerships\Services\PartnerForecastingService;
use App\Infrastructure\Eloquent\Models\InvoiceModel;
use App\Infrastructure\Eloquent\Models\PartnerProfitShareModel;
use App\Infrastructure\Eloquent\Models\PartnerWithdrawalModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class PartnerDashboardController extends BaseTenantController
{
    public function __construct(
        private PartnerForecastingService $forecastingService,
    ) {}

    private function getPartnerTenantId(Request $request): int
    {
        return (int) ($request->partner->tenant_id ?? $request->get('partner_tenant_id') ?? 0);
    }

    /**
     * GET /api/portal/dashboard — Main KPIs for partner
     */
    public function dashboard(Request $request): JsonResponse
    {
        $partner = $request->attributes->get('partner');
        $tenantId = $this->getPartnerTenantId($request);
        $today = Carbon::today();
        $yesterday = Carbon::yesterday();

        // Today's total sales
        $todaySales = InvoiceModel::query()->where('tenant_id', $this->getTenantId($request))->where('tenant_id', $tenantId)
            ->where('status', 'confirmed')
            ->whereDate('invoice_date', $today)
            ->sum('total');

        $yesterdaySales = InvoiceModel::query()->where('tenant_id', $this->getTenantId($request))->where('tenant_id', $tenantId)
            ->where('status', 'confirmed')
            ->whereDate('invoice_date', $yesterday)
            ->sum('total');

        $growth = $yesterdaySales > 0
            ? (($todaySales - $yesterdaySales) / $yesterdaySales) * 100
            : ($todaySales > 0 ? 100 : 0);

        // Partner's daily gross profit (simplified: profit based on (sell - cost) * qty)
        $todayProfit = DB::connection('tenant')
            ->table('invoice_items')
            ->join('invoices', 'invoice_items.invoice_id', '=', 'invoices.id')
            ->join('products', 'invoice_items.product_id', '=', 'products.id')
            ->where('invoices.tenant_id', $tenantId)
            ->where('invoices.status', 'confirmed')
            ->whereDate('invoices.invoice_date', $today)
            ->selectRaw('SUM((invoice_items.unit_price - products.cost_price) * invoice_items.quantity) as gross')
            ->value('gross') ?? 0;

        $partnerTodayProfit = (float) $todayProfit * ($partner->profit_share_percentage / 100);

        // Monthly
        $monthStart = Carbon::now()->startOfMonth();
        $monthProfit = DB::connection('tenant')
            ->table('invoice_items')
            ->join('invoices', 'invoice_items.invoice_id', '=', 'invoices.id')
            ->join('products', 'invoice_items.product_id', '=', 'products.id')
            ->where('invoices.tenant_id', $tenantId)
            ->where('invoices.status', 'confirmed')
            ->where('invoices.invoice_date', '>=', $monthStart)
            ->selectRaw('SUM((invoice_items.unit_price - products.cost_price) * invoice_items.quantity) as gross')
            ->value('gross') ?? 0;

        $partnerMonthProfit = (float) $monthProfit * ($partner->profit_share_percentage / 100);

        return $this->success([
            'kpis' => [
                'today_sales' => round((float) $todaySales, 6),
                'yesterday_sales' => round((float) $yesterdaySales, 6),
                'sales_growth_pct' => round($growth, 1),
                'partner_today_profit' => round($partnerTodayProfit, 6),
                'partner_month_profit' => round($partnerMonthProfit, 6),
                'total_pending' => (float) $partner->total_pending,
                'total_withdrawn' => (float) $partner->total_withdrawn,
                'profit_share_pct' => (float) $partner->profit_share_percentage,
            ],
        ]);
    }

    /**
     * GET /api/portal/profits?period=month|year — Profit breakdown
     */
    public function profits(Request $request): JsonResponse
    {
        $partner = $request->attributes->get('partner');
        $tenantId = $this->getPartnerTenantId($request);
        $period = $request->get('period', 'month'); // month | year

        $start = $period === 'year' ? Carbon::now()->startOfYear() : Carbon::now()->startOfMonth();
        $prevStart = $period === 'year' ? Carbon::now()->subYear()->startOfYear() : Carbon::now()->subMonth()->startOfMonth();
        $prevEnd = $period === 'year' ? Carbon::now()->subYear()->endOfYear() : Carbon::now()->subMonth()->endOfMonth();

        $calcProfit = function ($from, $to = null) use ($tenantId) {
            $q = DB::connection('tenant')
                ->table('invoice_items')
                ->join('invoices', 'invoice_items.invoice_id', '=', 'invoices.id')
                ->join('products', 'invoice_items.product_id', '=', 'products.id')
                ->where('invoices.tenant_id', $tenantId)
                ->where('invoices.status', 'confirmed')
                ->where('invoices.invoice_date', '>=', $from);
            if ($to) {
                $q->where('invoices.invoice_date', '<=', $to);
            }

            return (float) ($q->selectRaw('SUM((invoice_items.unit_price - products.cost_price) * invoice_items.quantity) as gross')->value('gross') ?? 0);
        };

        $currentProfit = $calcProfit($start);
        $previousProfit = $calcProfit($prevStart, $prevEnd);

        $partnerCurrent = $currentProfit * ($partner->profit_share_percentage / 100);
        $partnerPrevious = $previousProfit * ($partner->profit_share_percentage / 100);

        $growth = $partnerPrevious > 0
            ? (($partnerCurrent - $partnerPrevious) / $partnerPrevious) * 100
            : ($partnerCurrent > 0 ? 100 : 0);

        // Monthly breakdown chart data (last 6 months)
        $chartData = [];
        for ($i = 5; $i >= 0; $i--) {
            $mStart = Carbon::now()->subMonths($i)->startOfMonth();
            $mEnd = Carbon::now()->subMonths($i)->endOfMonth();
            $mProfit = $calcProfit($mStart, $mEnd);
            $chartData[] = [
                'month' => $mStart->format('M Y'),
                'month_ar' => $mStart->locale('ar')->isoFormat('MMM YYYY'),
                'system_profit' => round($mProfit, 6),
                'partner_profit' => round($mProfit * ($partner->profit_share_percentage / 100), 6),
            ];
        }

        return $this->success([
            'period' => $period,
            'current_profit' => round($partnerCurrent, 6),
            'previous_profit' => round($partnerPrevious, 6),
            'growth_pct' => round($growth, 1),
            'chart_data' => $chartData,
        ]);
    }

    /**
     * GET /api/portal/statement — Account statement (credits, withdrawals)
     */
    public function statement(Request $request): JsonResponse
    {
        $partner = $request->attributes->get('partner');
        $tenantId = $this->getPartnerTenantId($request);

        // Profit shares (credits)
        $profitShares = PartnerProfitShareModel::query()->where('tenant_id', $this->getTenantId($request))->with('distribution')
            ->where('tenant_id', $tenantId)
            ->where('partner_id', $partner->id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($s) => [
                'type' => 'credit',
                'date' => $s->created_at?->toDateString(),
                'description' => 'توزيع أرباح - '.($s->distribution?->created_at?->format('Y-m-d') ?? 'توزيع'),
                'amount' => (float) $s->amount,
            ]);

        // Withdrawals (debits)
        $withdrawals = PartnerWithdrawalModel::query()->where('tenant_id', $this->getTenantId($request))->where('partner_id', $partner->id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($w) => [
                'type' => 'debit',
                'date' => $w->created_at?->toDateString(),
                'description' => $w->notes ?? 'سحب أرباح',
                'amount' => (float) $w->amount,
            ]);

        // Merge and sort chronologically for correct running balance
        $allEntries = collect([...$profitShares, ...$withdrawals])
            ->sortBy('date')
            ->values();

        // Running balance
        $runningBalance = 0;
        $entries = $allEntries->map(function ($entry) use (&$runningBalance) {
            $runningBalance += $entry['type'] === 'credit' ? $entry['amount'] : -$entry['amount'];

            return array_merge($entry, ['balance' => round($runningBalance, 6)]);
        });

        // Reverse for display so newest is first
        $entries = $entries->reverse()->values();

        return $this->success([
            'partner' => [
                'name' => $partner->name,
                'total_pending' => (float) $partner->total_pending,
                'total_withdrawn' => (float) $partner->total_withdrawn,
                'net_profit' => round((float) $partner->total_pending + (float) $partner->total_withdrawn, 6),
            ],
            'entries' => $entries,
            'summary' => [
                'total_credited' => round($profitShares->sum('amount'), 6),
                'total_withdrawn' => round($withdrawals->sum('amount'), 6),
                'current_balance' => (float) $partner->total_pending,
            ],
        ]);
    }

    /**
     * GET /api/portal/top-products — Best selling products
     */
    public function topProducts(Request $request): JsonResponse
    {
        $tenantId = $this->getPartnerTenantId($request);
        $limit = (int) $request->get('limit', 10);
        $from = $request->get('from', Carbon::now()->startOfMonth()->toDateString());

        $products = DB::connection('tenant')
            ->table('invoice_items')
            ->join('invoices', 'invoice_items.invoice_id', '=', 'invoices.id')
            ->join('products', 'invoice_items.product_id', '=', 'products.id')
            ->where('invoices.tenant_id', $tenantId)
            ->where('invoices.status', 'confirmed')
            ->where('invoices.invoice_date', '>=', $from)
            ->selectRaw('
                products.id,
                products.name,
                products.name_ar,
                SUM(invoice_items.quantity) as total_qty,
                SUM(invoice_items.quantity * invoice_items.unit_price) as total_revenue,
                SUM((invoice_items.unit_price - products.cost_price) * invoice_items.quantity) as gross_profit
            ')
            ->groupBy('products.id', 'products.name', 'products.name_ar')
            ->orderByDesc('total_qty')
            ->limit($limit)
            ->get();

        return $this->success(['products' => $products]);
    }

    /**
     * GET /api/portal/forecast — AI end-of-year projection for this partner
     */
    public function forecast(Request $request): JsonResponse
    {
        $partner = $request->attributes->get('partner');
        $tenantId = $this->getPartnerTenantId($request);

        $full = $this->forecastingService->getEndOfYearProjections($tenantId);

        // Filter to only this partner's projection
        $partnerProjection = collect($full['partner_projections'])
            ->firstWhere('partner_id', $partner->id);

        return $this->success([
            'metrics' => $full['metrics'],
            'projection' => $partnerProjection,
        ]);
    }

    /**
     * GET /api/portal/statement/pdf — Export statement as PDF (plain HTML response for browser printing)
     */
    public function exportPdf(Request $request): Response
    {
        $partner = $request->attributes->get('partner');
        $tenantId = $this->getPartnerTenantId($request);

        // Get statement data
        $sharesQuery = PartnerProfitShareModel::query()->where('tenant_id', $this->getTenantId($request))->with('distribution')
            ->where('tenant_id', $tenantId)
            ->where('partner_id', $partner->id)
            ->orderBy('created_at', 'desc')
            ->get();

        $withdrawalsQuery = PartnerWithdrawalModel::query()->where('tenant_id', $this->getTenantId($request))->where('partner_id', $partner->id)
            ->orderBy('created_at', 'desc')
            ->get();

        $generatedAt = now()->format('Y-m-d H:i');

        // Build printable HTML
        $html = view('portal.statement-pdf', compact('partner', 'sharesQuery', 'withdrawalsQuery', 'generatedAt'))->render();

        return response($html, 200)->header('Content-Type', 'text/html');
    }
}
