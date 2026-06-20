<?php

namespace Tests\Feature\Accounting;

use App\Application\Accounting\Services\AccountingService;
use App\Infrastructure\Eloquent\Models\AccountModel;
use App\Infrastructure\Eloquent\Models\JournalEntryLineModel;
use App\Infrastructure\Eloquent\Models\JournalEntryModel;
use Illuminate\Support\Str;
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
            'id' => Str::uuid()->toString(),
            'tenant_id' => '00000000-0000-0000-0000-000000000001',
            'code' => '4000',
            'name' => 'Sales Revenue',
            'name_ar' => 'إيرادات المبيعات',
            'type' => 'revenue',
            'is_active' => true,
        ]);

        $expenseAccount = AccountModel::create([
            'id' => Str::uuid()->toString(),
            'tenant_id' => '00000000-0000-0000-0000-000000000001',
            'code' => '5000',
            'name' => 'COGS',
            'name_ar' => 'تكلفة البضاعة المباعة',
            'type' => 'expense',
            'is_active' => true,
        ]);

        // 2. Create Journal Entry (Revenue: 1000 Credit, Expense: 400 Debit)
        $entry = JournalEntryModel::create([
            'id' => Str::uuid()->toString(),
            'tenant_id' => '00000000-0000-0000-0000-000000000001',
            'entry_number' => 'JE-001',
            'date' => now(),
            'description' => 'Test Sales',
            'is_posted' => true,
        ]);

        JournalEntryLineModel::create([
            'id' => Str::uuid()->toString(),
            'journal_entry_id' => $entry->id,
            'account_id' => $revenueAccount->id,
            'debit' => 0,
            'credit' => 1000,
        ]);

        JournalEntryLineModel::create([
            'id' => Str::uuid()->toString(),
            'journal_entry_id' => $entry->id,
            'account_id' => $expenseAccount->id,
            'debit' => 400,
            'credit' => 0,
        ]);

        // 3. Run Accounting Service
        $service = app(AccountingService::class);
        $incomeStatement = $service->generateIncomeStatement(
            new \DateTimeImmutable(now()->subMonth()->toDateTimeString()),
            new \DateTimeImmutable(now()->addMonth()->toDateTimeString()),
            '00000000-0000-0000-0000-000000000001'
        );

        // 4. Assertions
        $this->assertEquals(1000, $incomeStatement['total_revenue']);
        $this->assertEquals(400, $incomeStatement['total_expenses']);
        $this->assertEquals(600, $incomeStatement['net_income']);
    }
}
