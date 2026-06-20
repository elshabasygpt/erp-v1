<?php

declare(strict_types=1);

namespace Tests\Unit\Domain\Inventory;

use App\Domain\Inventory\Services\InventoryReconciliationService;
use App\Domain\Accounting\Services\AccountMappingService;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;
use Mockery;

class InventoryReconciliationServiceTest extends TestCase
{
    public function test_perfectly_reconciled_inventory()
    {
        $tenantId = 'tenant-1';

        // Mock Account Mapping
        $accountMapping = Mockery::mock(AccountMappingService::class);
        $accountMapping->shouldReceive('resolve')->with('inventory')->andReturn('acc-inv');

        DB::shouldReceive('connection')->with('tenant')->andReturnSelf();

        // 1. Mock GL Balance Query
        $glTableMock = Mockery::mock();
        DB::shouldReceive('table')->with('journal_entry_lines')->andReturn($glTableMock);
        $glTableMock->shouldReceive('join')->andReturnSelf();
        $glTableMock->shouldReceive('where')->andReturnSelf();
        $glTableMock->shouldReceive('select')->andReturnSelf();
        $glTableMock->shouldReceive('value')->with('balance')->andReturn(1500.50);

        // 2. Mock Global Valuation Query
        $valTableMock = Mockery::mock();
        DB::shouldReceive('table')->with('warehouse_products')->andReturn($valTableMock);
        
        // Setup sequential returns for the 3 queries against `warehouse_products`
        // 1st: Valuation
        // 2nd: Warehouse Breakdown
        // 3rd: Product Breakdown
        $valTableMock->shouldReceive('where')->andReturnSelf();
        $valTableMock->shouldReceive('select')->andReturnSelf();
        
        // Since the Service calls `value('valuation')` then `get()` twice for the breakdowns
        // It's easier to assert the logic using Mockery sequences or just let it return dummy data
        $valTableMock->shouldReceive('value')->with('valuation')->andReturn(1500.50);

        $valTableMock->shouldReceive('join')->andReturnSelf();
        $valTableMock->shouldReceive('groupBy')->andReturnSelf();
        $valTableMock->shouldReceive('orderByDesc')->andReturnSelf();
        $valTableMock->shouldReceive('get')->andReturn(
            collect([
                (object)['warehouse_id' => 1, 'warehouse_name' => 'Main', 'warehouse_valuation' => 1500.50]
            ]),
            collect([
                (object)['product_id' => 10, 'product_name' => 'Tire', 'product_valuation' => 1500.50]
            ])
        );

        $service = new InventoryReconciliationService($accountMapping);
        $report = $service->generateReport($tenantId);

        $this->assertEquals(1500.50, $report->glBalance);
        $this->assertEquals(1500.50, $report->inventoryValuation);
        $this->assertEquals(0.0, $report->difference);
        $this->assertTrue($report->isReconciled);
        $this->assertCount(1, $report->warehouseBreakdown);
        $this->assertCount(1, $report->productBreakdown);
    }
}
