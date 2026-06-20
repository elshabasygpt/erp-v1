<?php

namespace App\Domain\Analytics\Services;

class SalesAnalyticsService
{
    public function calcGrowthRate(float $current, float $previous): float
    {
        if ($previous == 0) {
            return 0;
        }

        return round((($current - $previous) / $previous) * 100, 6);
    }

    public function calcConversionRate(int $converted, int $total): float
    {
        if ($total == 0) {
            return 0;
        }

        return round(($converted / $total) * 100, 6);
    }

    public function calcAverageOrderValue(float $totalRevenue, int $orderCount): float
    {
        if ($orderCount == 0) {
            return 0;
        }

        return round($totalRevenue / $orderCount, 6);
    }

    public function calcReturnRate(int $returnedOrders, int $totalOrders): float
    {
        if ($totalOrders == 0) {
            return 0;
        }

        return round(($returnedOrders / $totalOrders) * 100, 6);
    }
}
