<?php

namespace Tests\Unit\Domain\Inventory;

use App\Domain\Inventory\Services\InventoryForecastingService;
use Mockery;
use PHPUnit\Framework\TestCase;

class InventoryForecastingServiceTest extends TestCase
{
    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_service_initialization()
    {
        $service = new InventoryForecastingService;
        $this->assertInstanceOf(InventoryForecastingService::class, $service);
        $this->assertTrue(method_exists($service, 'getLowStockForecasts'));
    }
}
