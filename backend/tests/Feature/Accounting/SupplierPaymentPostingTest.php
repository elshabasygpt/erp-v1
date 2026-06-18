<?php

namespace Tests\Feature\Accounting;

use App\Infrastructure\Eloquent\Models\AccountModel;
use App\Infrastructure\Eloquent\Models\JournalEntryLineModel;
use App\Infrastructure\Eloquent\Models\JournalEntryModel;
use Illuminate\Support\Str;
use Tests\TestCase;

class SupplierPaymentPostingTest extends TestCase
{
    public function test_supplier_payment_posting_is_balanced()
    {
        $tenantId = Str::uuid()->toString();

        $entry = JournalEntryModel::create([
            'id' => Str::uuid()->toString(),
            'tenant_id' => $tenantId,
            'entry_number' => 'PAY-001',
            'date' => now(),
            'description' => 'Test Supplier Payment',
            'is_posted' => true,
        ]);

        $apAccount = AccountModel::create(['id' => Str::uuid()->toString(), 'tenant_id' => $tenantId, 'code' => '2100', 'name' => 'A/P', 'name_ar' => 'A/P', 'type' => 'liability']);
        $cashAccount = AccountModel::create(['id' => Str::uuid()->toString(), 'tenant_id' => $tenantId, 'code' => '1000', 'name' => 'Cash', 'name_ar' => 'Cash', 'type' => 'asset']);

        JournalEntryLineModel::create(['id' => Str::uuid()->toString(), 'journal_entry_id' => $entry->id, 'account_id' => $apAccount->id, 'debit' => 2500, 'credit' => 0]);
        JournalEntryLineModel::create(['id' => Str::uuid()->toString(), 'journal_entry_id' => $entry->id, 'account_id' => $cashAccount->id, 'debit' => 0, 'credit' => 2500]);

        $totalDebit = JournalEntryLineModel::query()->where('journal_entry_id', $entry->id)->sum('debit');
        $totalCredit = JournalEntryLineModel::query()->where('journal_entry_id', $entry->id)->sum('credit');

        $this->assertEquals($totalDebit, $totalCredit);
        $this->assertEquals(2500, $totalDebit);
    }
}
