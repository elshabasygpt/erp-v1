<?php

namespace Tests\Feature\Accounting;

use App\Application\Accounting\Services\AccountingService;
use App\Infrastructure\Eloquent\Models\Accounting\AccountModel;
use App\Infrastructure\Eloquent\Models\Accounting\JournalEntryModel;
use App\Infrastructure\Eloquent\Models\Accounting\JournalEntryLineModel;

use Tests\TestCase;

class AccountingServiceTest extends TestCase
{
    

    protected function setUp(): void
    {
        parent::setUp();
        // Since sqlite is used, refresh database creates the tables
    }

    public function test_income_statement_generates_correct_totals()
    {
        // 1. Create Accounts
        $revenueAccount = AccountModel::create([
            'id' => \Illuminate\Support\Str::uuid()->toString(),
            'code' => '4000',
            'name' => 'Sales Revenue',
            'type' => 'Revenue',
            'is_active' => true,
        ]);

        $expenseAccount = AccountModel::create([
            'id' => \Illuminate\Support\Str::uuid()->toString(),
            'code' => '5000',
            'name' => 'COGS',
            'type' => 'Expense',
            'is_active' => true,
        ]);

        // 2. Create Journal Entry (Revenue: 1000 Credit, Expense: 400 Debit)
        $entry = JournalEntryModel::create([
            'id' => \Illuminate\Support\Str::uuid()->toString(),
            'entry_number' => 'JE-001',
            'entry_date' => now(),
            'description' => 'Test Sales',
            'status' => 'posted'
        ]);

        JournalEntryLineModel::create([
            'id' => \Illuminate\Support\Str::uuid()->toString(),
            'journal_entry_id' => $entry->id,
            'account_id' => $revenueAccount->id,
            'debit' => 0,
            'credit' => 1000
        ]);

        JournalEntryLineModel::create([
            'id' => \Illuminate\Support\Str::uuid()->toString(),
            'journal_entry_id' => $entry->id,
            'account_id' => $expenseAccount->id,
            'debit' => 400,
            'credit' => 0
        ]);

        // 3. Run Accounting Service
        $service = app(AccountingService::class);
        $startDate = now()->subDays(1)->format('Y-m-d');
        $endDate = now()->addDays(1)->format('Y-m-d');

        $incomeStatement = $service->generateIncomeStatement($startDate, $endDate);

        // 4. Assertions
        $this->assertEquals(1000, $incomeStatement['totals']['total_revenue']);
        $this->assertEquals(400, $incomeStatement['totals']['total_expenses']);
        $this->assertEquals(600, $incomeStatement['totals']['net_income']);
    }
}
