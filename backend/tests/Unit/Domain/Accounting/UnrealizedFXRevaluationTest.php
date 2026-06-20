<?php

declare(strict_types=1);

namespace Tests\Unit\Domain\Accounting;

use App\Domain\Accounting\Services\AccountMappingService;
use App\Domain\Accounting\Services\FXGainLossService;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;
use Mockery;
use App\Domain\Accounting\Repositories\JournalEntryRepositoryInterface;

class UnrealizedFXRevaluationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        
        // Mock the repository to prevent DB writes and capture the generated entry
        $this->repo = Mockery::mock(JournalEntryRepositoryInterface::class);
        $this->app->instance(JournalEntryRepositoryInterface::class, $this->repo);
    }

    public function test_calculate_unrealized_gains_losses_ar_gain()
    {
        $tenantId = 'tenant-1';
        $date = '2026-06-30';

        // Mock Account Mapping
        $accountMapping = Mockery::mock(AccountMappingService::class);
        $accountMapping->shouldReceive('resolve')->with('unrealized_fx_gain_loss')->andReturn('acc-fx');
        $accountMapping->shouldReceive('resolve')->with('ar')->andReturn('acc-ar');
        $accountMapping->shouldReceive('resolve')->with('ap')->andReturn('acc-ap');

        // Setup SQLite in-memory for testing the query logic if necessary,
        // or just mock DB. Since we are in a unit test, mocking the DB facade is easier.
        DB::shouldReceive('connection')->with('tenant')->andReturnSelf();
        
        $tableMock = Mockery::mock();
        DB::shouldReceive('table')->with('exchange_rates')->andReturn($tableMock);
        $tableMock->shouldReceive('where')->andReturnSelf();
        $tableMock->shouldReceive('orderBy')->andReturnSelf();
        $tableMock->shouldReceive('get')->andReturn(collect([
            (object)['currency_id' => 'USD', 'rate' => 1.20] // EOM Rate
        ]));

        $arTableMock = Mockery::mock();
        DB::shouldReceive('table')->with('invoices')->andReturn($arTableMock);
        $arTableMock->shouldReceive('where')->andReturnSelf();
        $arTableMock->shouldReceive('whereNotNull')->andReturnSelf();
        $arTableMock->shouldReceive('get')->andReturn(collect([
            (object)[
                'id' => 'inv-1',
                'currency_id' => 'USD',
                'exchange_rate' => 1.00, // Historical Rate
                'total' => 1000,
                'paid_amount' => 0
            ]
        ]));

        $apTableMock = Mockery::mock();
        DB::shouldReceive('table')->with('purchase_invoices')->andReturn($apTableMock);
        $apTableMock->shouldReceive('where')->andReturnSelf();
        $apTableMock->shouldReceive('whereNotNull')->andReturnSelf();
        $apTableMock->shouldReceive('get')->andReturn(collect([]));

        // Expect two JournalEntries to be created: The Revaluation and the Reversal
        $this->repo->shouldReceive('create')->times(2)->withArgs(function ($je) {
            $lines = $je->getLines();
            
            // Revaluation Entry:
            // Open = $1000. Historical = 1000 * 1 = 1000
            // Current = 1000 * 1.2 = 1200
            // Variance = +200 (Gain)
            // Dr AR 200, Cr Unrealized FX Gain 200
            
            if ($je->getReferenceType() === 'fx_revaluation') {
                $this->assertEquals(200.0, $lines[0]->getDebit()); // Dr AR
                $this->assertEquals(200.0, $lines[1]->getCredit()); // Cr FX
                return true;
            }
            
            if ($je->getReferenceType() === 'fx_reversal') {
                $this->assertEquals(200.0, $lines[0]->getCredit()); // Cr AR
                $this->assertEquals(200.0, $lines[1]->getDebit()); // Dr FX
                return true;
            }

            return false;
        });

        $service = new FXGainLossService($accountMapping);
        $entriesCreated = $service->calculateUnrealizedGainsLosses($tenantId, $date);

        $this->assertEquals(1, $entriesCreated); // 1 Invoice processed
    }
}
