<?php

namespace Tests\Unit\Domain\Inventory;

use PHPUnit\Framework\TestCase;
use App\Domain\Inventory\Services\InventoryForecastingService;
use Mockery;

class InventoryForecastingServiceTest extends TestCase
{
    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_service_initialization()
    {
        $service = new InventoryForecastingService();
        $this->assertInstanceOf(InventoryForecastingService::class, $service);
        $this->assertTrue(method_exists($service, 'getLowStockForecasts'));
    }
}
