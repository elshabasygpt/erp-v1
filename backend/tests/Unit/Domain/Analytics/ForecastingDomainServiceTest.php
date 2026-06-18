<?php

namespace Tests\Unit\Domain\Analytics;

use App\Domain\Analytics\Services\ForecastingDomainService;
use PHPUnit\Framework\TestCase;

class ForecastingDomainServiceTest extends TestCase
{
    private ForecastingDomainService $service;

    protected function setUp(): void
    {
        $this->service = new ForecastingDomainService;
    }

    public function test_moving_average_returns_average_of_last_n_periods(): void
    {
        $values = [10, 20, 30, 40, 50];
        $result = $this->service->movingAverage($values, 3);
        $this->assertEquals(40, $result);
    }

    public function test_moving_average_returns_zero_for_empty_array(): void
    {
        $result = $this->service->movingAverage([], 3);
        $this->assertEquals(0, $result);
    }

    public function test_days_until_stockout_calculates_correctly(): void
    {
        $result = $this->service->daysUntilStockout(100, 5);
        $this->assertEquals(20, $result);
    }

    public function test_days_until_stockout_returns_999_when_no_sales(): void
    {
        $result = $this->service->daysUntilStockout(100, 0);
        $this->assertEquals(999, $result);
    }

    public function test_suggest_reorder_qty_includes_safety_days(): void
    {
        $result = $this->service->suggestReorderQty(
            dailyAvgSales: 10,
            leadTimeDays: 7,
            safetyDays: 7,
        );
        $this->assertEquals(140, $result);
    }

    public function test_needs_reorder_returns_true_when_stock_is_low(): void
    {
        $result = $this->service->needsReorder(
            currentStock: 50,
            dailyAvgSales: 10,
            leadTimeDays: 7,
        );
        $this->assertTrue($result);
    }

    public function test_needs_reorder_returns_false_when_stock_is_sufficient(): void
    {
        $result = $this->service->needsReorder(
            currentStock: 500,
            dailyAvgSales: 10,
            leadTimeDays: 7,
        );
        $this->assertFalse($result);
    }
}
