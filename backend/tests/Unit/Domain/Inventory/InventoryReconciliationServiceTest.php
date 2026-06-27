<?php

declare(strict_types=1);

namespace Tests\Unit\Domain\Inventory;

use App\Domain\Accounting\Services\AccountMappingService;
use App\Domain\Inventory\Services\InventoryReconciliationService;
use Illuminate\Support\Facades\DB;
use Mockery;
use Tests\TestCase;

class InventoryReconciliationServiceTest extends TestCase
{
    public function test_perfectly_reconciled_inventory()
    {
        $tenantId = 'tenant-1';

        // Prevent TestCase::tearDown() DB::connection('sqlite') from hitting the DB mock
        $sqliteConn = Mockery::mock();
        $sqliteConn->shouldReceive('getPdo')->andReturn(null);
        DB::shouldReceive('connection')->with('sqlite')->andReturn($sqliteConn);

        // Mock Account Mapping
        $accountMapping = Mockery::mock(AccountMappingService::class);
        $accountMapping->shouldReceive('resolve')->with('inventory')->andReturn('acc-inv');

        DB::shouldReceive('connection')->with('tenant')->andReturnSelf();
        DB::shouldReceive('raw')->andReturnUsing(fn ($expr) => new \Illuminate\Database\Query\Expression($expr));

        // 1. Mock GL Balance Query (journal_entry_lines)
        $glTableMock = Mockery::mock();
        DB::shouldReceive('table')->with('journal_entry_lines')->andReturn($glTableMock);
        $glTableMock->shouldReceive('join')->andReturnSelf();
        $glTableMock->shouldReceive('where')->andReturnSelf();
        $glTableMock->shouldReceive('select')->andReturnSelf();
        $glTableMock->shouldReceive('value')->with('balance')->andReturn(1500.50);

        // 2. Mock warehouse_products queries (valuation + warehouse breakdown + product breakdown)
        $valTableMock = Mockery::mock();
        DB::shouldReceive('table')->with('warehouse_products')->andReturn($valTableMock);
        $valTableMock->shouldReceive('where')->andReturnSelf();
        $valTableMock->shouldReceive('select')->andReturnSelf();
        $valTableMock->shouldReceive('value')->with('valuation')->andReturn(1500.50);
        $valTableMock->shouldReceive('join')->andReturnSelf();
        $valTableMock->shouldReceive('groupBy')->andReturnSelf();
        $valTableMock->shouldReceive('orderByDesc')->andReturnSelf();
        $valTableMock->shouldReceive('get')->andReturn(
            collect([(object)['warehouse_id' => 1, 'warehouse_name' => 'Main', 'warehouse_valuation' => 1500.50]]),
            collect([(object)['product_id' => 10, 'product_name' => 'Tire', 'product_valuation' => 1500.50]])
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
