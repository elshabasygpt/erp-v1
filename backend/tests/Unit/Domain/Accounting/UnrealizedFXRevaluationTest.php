<?php

declare(strict_types=1);

namespace Tests\Unit\Domain\Accounting;

use App\Domain\Accounting\Repositories\JournalEntryRepositoryInterface;
use App\Domain\Accounting\Services\AccountMappingService;
use App\Domain\Accounting\Services\FXGainLossService;
use Illuminate\Support\Facades\DB;
use Mockery;
use Tests\TestCase;

class UnrealizedFXRevaluationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->repo = Mockery::mock(JournalEntryRepositoryInterface::class);
        $this->app->instance(JournalEntryRepositoryInterface::class, $this->repo);
    }

    public function test_calculate_unrealized_gains_losses_ar_gain()
    {
        $tenantId = 'tenant-1';
        $date = '2026-06-30';

        // Prevent TestCase::tearDown() DB::connection('sqlite') from hitting the DB mock
        $sqliteConn = Mockery::mock();
        $sqliteConn->shouldReceive('getPdo')->andReturn(null);
        DB::shouldReceive('connection')->with('sqlite')->andReturn($sqliteConn);

        // Mock Account Mapping
        $accountMapping = Mockery::mock(AccountMappingService::class);
        $accountMapping->shouldReceive('resolve')->with('unrealized_fx_gain_loss')->andReturn('acc-fx');
        $accountMapping->shouldReceive('resolve')->with('ar')->andReturn('acc-ar');
        $accountMapping->shouldReceive('resolve')->with('ap')->andReturn('acc-ap');

        DB::shouldReceive('connection')->with('tenant')->andReturnSelf();

        // Mock journal_entries (idempotency check — return empty so no existing entries to reverse)
        $jeMock = Mockery::mock();
        DB::shouldReceive('table')->with('journal_entries')->andReturn($jeMock);
        $jeMock->shouldReceive('where')->andReturnSelf();
        $jeMock->shouldReceive('whereRaw')->andReturnSelf();
        $jeMock->shouldReceive('whereIn')->andReturnSelf();
        $jeMock->shouldReceive('pluck')->andReturn(collect([]));
        $jeMock->shouldReceive('delete')->andReturn(0);

        // Mock journal_entry_lines (idempotency cleanup)
        $jelMock = Mockery::mock();
        DB::shouldReceive('table')->with('journal_entry_lines')->andReturn($jelMock);
        $jelMock->shouldReceive('whereIn')->andReturnSelf();
        $jelMock->shouldReceive('delete')->andReturn(0);

        // Mock exchange_rates: USD EOM rate = 1.20
        $tableMock = Mockery::mock();
        DB::shouldReceive('table')->with('exchange_rates')->andReturn($tableMock);
        $tableMock->shouldReceive('where')->andReturnSelf();
        $tableMock->shouldReceive('orderBy')->andReturnSelf();
        $tableMock->shouldReceive('get')->andReturn(collect([
            (object)['currency_id' => 'USD', 'rate' => 1.20],
        ]));

        // Mock invoices: 1 open USD invoice at historical rate 1.00
        $arTableMock = Mockery::mock();
        DB::shouldReceive('table')->with('invoices')->andReturn($arTableMock);
        $arTableMock->shouldReceive('where')->andReturnSelf();
        $arTableMock->shouldReceive('whereNotNull')->andReturnSelf();
        $arTableMock->shouldReceive('get')->andReturn(collect([
            (object)[
                'id' => 'inv-1',
                'currency_id' => 'USD',
                'exchange_rate' => 1.00,
                'total' => 1000,
                'paid_amount' => 0,
            ],
        ]));

        // Mock purchase_invoices: empty
        $apTableMock = Mockery::mock();
        DB::shouldReceive('table')->with('purchase_invoices')->andReturn($apTableMock);
        $apTableMock->shouldReceive('where')->andReturnSelf();
        $apTableMock->shouldReceive('whereNotNull')->andReturnSelf();
        $apTableMock->shouldReceive('get')->andReturn(collect([]));

        // Expect two JournalEntries: the revaluation and its auto-reversal
        // Variance = (1.20 - 1.00) * 1000 = 200 (AR gain)
        // Revaluation: Dr AR 200, Cr FX Gain 200
        // Reversal:    Cr AR 200, Dr FX Gain 200
        $this->repo->shouldReceive('create')->times(2)->withArgs(function ($je) {
            $lines = $je->getLines();

            if ($je->getReferenceType() === 'fx_revaluation') {
                $this->assertEquals(200.0, $lines[0]->getDebit());
                $this->assertEquals(200.0, $lines[1]->getCredit());
                return true;
            }

            if ($je->getReferenceType() === 'fx_reversal') {
                $this->assertEquals(200.0, $lines[0]->getCredit());
                $this->assertEquals(200.0, $lines[1]->getDebit());
                return true;
            }

            return false;
        })->andReturnUsing(fn ($je) => $je);

        $service = new FXGainLossService($accountMapping);
        $entriesCreated = $service->calculateUnrealizedGainsLosses($tenantId, $date);

        $this->assertEquals(1, $entriesCreated);
    }
}
