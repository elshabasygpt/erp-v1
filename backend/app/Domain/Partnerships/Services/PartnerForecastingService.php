<?php

declare(strict_types=1);

namespace App\Domain\Partnerships\Services;

use App\Infrastructure\Eloquent\Models\InvoiceModel;
use App\Infrastructure\Eloquent\Models\PartnerModel;
use Carbon\Carbon;

class PartnerForecastingService
{
    /**
     * Get end-of-year profit projections for all active partners.
     *
     * @return array
     */
    public function getEndOfYearProjections(): array
    {
        $startOfYear = Carbon::now()->startOfYear();
        $today = Carbon::now();
        $endOfYear = Carbon::now()->endOfYear();

        $daysElapsed = max(1, $startOfYear->diffInDays($today));
        $remainingDays = $today->diffInDays($endOfYear);

        // Calculate Gross Tenant Profit 
        // Gross Profit = Total Sales - Total Purchases 
        // For simplicity in this demo system, we treat Invoice Total as purely profit or sub-calculate it.
        // Usually, Profit = (Sell Price - Cost Price) * quantity. Let's write an accurate profit calculator:
        
        $totalSystemProfit = \Illuminate\Support\Facades\DB::connection('tenant')
            ->table('invoice_items')
            ->join('invoices', 'invoice_items.invoice_id', '=', 'invoices.id')
            ->join('products', 'invoice_items.product_id', '=', 'products.id')
            ->where('invoices.status', 'confirmed')
            ->whereBetween('invoices.invoice_date', [$startOfYear, $today])
            ->selectRaw('SUM((invoice_items.unit_price - products.cost_price) * invoice_items.quantity) as gross_profit')
            ->value('gross_profit') ?? 0;

        $totalSystemProfit = (float) $totalSystemProfit;
        
        $dailyProfitVelocity = $totalSystemProfit / $daysElapsed;
        $projectedRemainingProfit = $dailyProfitVelocity * $remainingDays;
        
        $totalExpectedYearlyProfit = $totalSystemProfit + $projectedRemainingProfit;

        $partners = PartnerModel::where('is_active', true)->get();
        $projections = [];

        foreach ($partners as $partner) {
            $expectedReturns = ($totalExpectedYearlyProfit * ($partner->profit_share_percentage / 100));
            $currentShare = ($totalSystemProfit * ($partner->profit_share_percentage / 100));
            
            $projections[] = [
                'partner_id' => $partner->id,
                'name' => $partner->name,
                'profit_share_percentage' => (float) $partner->profit_share_percentage,
                'current_accumulated_profit' => round($currentShare, 2),
                'projected_eoy_profit' => round($expectedReturns, 2),
                'trajectory_trend' => $dailyProfitVelocity > 0 ? 'up' : 'flat'
            ];
        }

        // Sort by highest projected profit
        usort($projections, fn($a, $b) => $b['projected_eoy_profit'] <=> $a['projected_eoy_profit']);

        return [
            'metrics' => [
                'days_elapsed' => $daysElapsed,
                'remaining_days' => $remainingDays,
                'current_total_profit' => round($totalSystemProfit, 2),
                'projected_total_profit' => round($totalExpectedYearlyProfit, 2),
                'daily_profit_velocity' => round($dailyProfitVelocity, 2)
            ],
            'partner_projections' => $projections
        ];
    }
}
