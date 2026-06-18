<?php

namespace Tests\Feature\Accounting;

use App\Infrastructure\Eloquent\Models\AccountModel;
use App\Infrastructure\Eloquent\Models\JournalEntryLineModel;
use App\Infrastructure\Eloquent\Models\JournalEntryModel;
use Illuminate\Support\Str;
use Tests\TestCase;

class InvoicePostingTest extends TestCase
{
    public function test_invoice_posting_is_balanced()
    {
        $tenantId = Str::uuid()->toString();

        $entry = JournalEntryModel::create([
            'id' => Str::uuid()->toString(),
            'tenant_id' => $tenantId,
            'entry_number' => 'INV-001',
            'date' => now(),
            'description' => 'Test Sales Invoice',
            'is_posted' => true,
        ]);

        $arAccount = AccountModel::create(['id' => Str::uuid()->toString(), 'tenant_id' => $tenantId, 'code' => '1200', 'name' => 'A/R', 'name_ar' => 'A/R', 'type' => 'asset']);
        $revenueAccount = AccountModel::create(['id' => Str::uuid()->toString(), 'tenant_id' => $tenantId, 'code' => '4000', 'name' => 'Revenue', 'name_ar' => 'Revenue', 'type' => 'revenue']);
        $taxAccount = AccountModel::create(['id' => Str::uuid()->toString(), 'tenant_id' => $tenantId, 'code' => '2200', 'name' => 'VAT Payable', 'name_ar' => 'VAT Payable', 'type' => 'liability']);

        JournalEntryLineModel::create(['id' => Str::uuid()->toString(), 'journal_entry_id' => $entry->id, 'account_id' => $arAccount->id, 'debit' => 1150, 'credit' => 0]);
        JournalEntryLineModel::create(['id' => Str::uuid()->toString(), 'journal_entry_id' => $entry->id, 'account_id' => $revenueAccount->id, 'debit' => 0, 'credit' => 1000]);
        JournalEntryLineModel::create(['id' => Str::uuid()->toString(), 'journal_entry_id' => $entry->id, 'account_id' => $taxAccount->id, 'debit' => 0, 'credit' => 150]);

        $totalDebit = JournalEntryLineModel::query()->where('journal_entry_id', $entry->id)->sum('debit');
        $totalCredit = JournalEntryLineModel::query()->where('journal_entry_id', $entry->id)->sum('credit');

        $this->assertEquals($totalDebit, $totalCredit);
        $this->assertEquals(1150, $totalDebit);
    }
}
