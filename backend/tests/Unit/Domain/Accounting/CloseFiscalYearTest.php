<?php

declare(strict_types=1);

namespace Tests\Unit\Domain\Accounting;

use App\Domain\Accounting\Services\YearEndClosingService;
use App\Domain\Accounting\Services\AccountMappingService;
use App\Domain\Accounting\Repositories\JournalEntryRepositoryInterface;
use App\Domain\Accounting\Entities\JournalEntry;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;
use Mockery;

class CloseFiscalYearTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        
        $this->repo = Mockery::mock(JournalEntryRepositoryInterface::class);
        $this->app->instance(JournalEntryRepositoryInterface::class, $this->repo);
    }

    public function test_year_end_closing_generates_correct_journal_entry()
    {
        $tenantId = 'tenant-1';
        $periodId = 'period-2026';
        $userId = 'user-1';

        // Mock Account Mapping
        $accountMapping = Mockery::mock(AccountMappingService::class);
        $accountMapping->shouldReceive('resolve')->with('retained_earnings')->andReturn('acc-retained-earnings');

        DB::shouldReceive('connection')->with('tenant')->andReturnSelf();

        // Mock Fiscal Period
        $periodMock = Mockery::mock();
        DB::shouldReceive('table')->with('fiscal_periods')->andReturn($periodMock);
        $periodMock->shouldReceive('where')->andReturnSelf();
        $periodMock->shouldReceive('first')->andReturn((object)[
            'id' => $periodId,
            'name' => '2026',
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
        ]);

        // Mock Accounts
        $accountsMock = Mockery::mock();
        DB::shouldReceive('table')->with('accounts')->andReturn($accountsMock);
        $accountsMock->shouldReceive('where')->andReturnSelf();
        $accountsMock->shouldReceive('whereIn')->andReturnSelf();
        $accountsMock->shouldReceive('get')->andReturn(collect([
            (object)['id' => 'acc-revenue', 'type' => 'revenue'],
            (object)['id' => 'acc-expense', 'type' => 'expense']
        ]));

        // Mock Journal Entry Lines (Balances)
        $linesMock = Mockery::mock();
        DB::shouldReceive('table')->with('journal_entry_lines')->andReturn($linesMock);
        $linesMock->shouldReceive('join')->andReturnSelf();
        $linesMock->shouldReceive('where')->andReturnSelf();
        $linesMock->shouldReceive('whereBetween')->andReturnSelf();
        $linesMock->shouldReceive('select')->andReturnSelf();
        
        // Return Net Balance: Revenue = -10,000 (Credit), Expense = 4,000 (Debit)
        $linesMock->shouldReceive('value')->with('net')->andReturnValues([-10000.0, 4000.0]);

        // Expect Journal Entry
        // Revenue has Credit 10k -> Needs Debit 10k to close
        // Expense has Debit 4k -> Needs Credit 4k to close
        // Diff = 6k Net Income -> Credit Retained Earnings 6k
        
        $this->repo->shouldReceive('create')->once()->withArgs(function (JournalEntry $je) {
            $this->assertEquals('YEC-period-2026', $je->getEntryNumber());
            $this->assertEquals('fiscal_year_close', $je->getReferenceType());
            
            $lines = $je->getLines();
            $this->assertCount(3, $lines);

            // Revenue
            $this->assertEquals('acc-revenue', $lines[0]->getAccountId());
            $this->assertEquals(10000.0, $lines[0]->getDebit());

            // Expense
            $this->assertEquals('acc-expense', $lines[1]->getAccountId());
            $this->assertEquals(4000.0, $lines[1]->getCredit());

            // Retained Earnings
            $this->assertEquals('acc-retained-earnings', $lines[2]->getAccountId());
            $this->assertEquals(6000.0, $lines[2]->getCredit()); // Net Income

            return true;
        });

        $service = new YearEndClosingService($accountMapping, $this->repo);
        $service->generateClosingEntry($tenantId, $periodId, $userId);
    }
}
