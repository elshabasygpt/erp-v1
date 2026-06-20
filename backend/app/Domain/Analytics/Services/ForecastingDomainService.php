<?php

namespace App\Domain\Analytics\Services;

class ForecastingDomainService
{
    public function movingAverage(array $values, int $periods = 3): float
    {
        if (empty($values)) {
            return 0;
        }
        $slice = array_slice($values, -$periods);

        return round(array_sum($slice) / count($slice), 6);
    }

    public function daysUntilStockout(float $currentStock, float $dailyAvgSales): int
    {
        if ($dailyAvgSales <= 0) {
            return 999;
        }

        return (int) floor($currentStock / $dailyAvgSales);
    }

    public function suggestReorderQty(
        float $dailyAvgSales,
        int $leadTimeDays,
        int $safetyDays = 7
    ): float {
        return round($dailyAvgSales * ($leadTimeDays + $safetyDays), 0);
    }

    public function needsReorder(float $currentStock, float $dailyAvgSales, int $leadTimeDays): bool
    {
        $daysLeft = $this->daysUntilStockout($currentStock, $dailyAvgSales);

        return $daysLeft <= $leadTimeDays;
    }
}
