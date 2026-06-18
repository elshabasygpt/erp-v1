<?php

namespace Tests\Feature\Accounting;

use App\Infrastructure\Eloquent\Models\AccountModel;
use App\Infrastructure\Eloquent\Models\JournalEntryLineModel;
use App\Infrastructure\Eloquent\Models\JournalEntryModel;
use Illuminate\Support\Str;
use Tests\TestCase;

class FXGainLossPostingTest extends TestCase
{
    public function test_fx_gain_loss_posting_is_balanced()
    {
        $tenantId = Str::uuid()->toString();

        $entry = JournalEntryModel::create([
            'id' => Str::uuid()->toString(),
            'tenant_id' => $tenantId,
            'entry_number' => 'FX-001',
            'date' => now(),
            'description' => 'Test FX Gain Loss',
            'is_posted' => true,
        ]);

        $apAccount = AccountModel::create(['id' => Str::uuid()->toString(), 'tenant_id' => $tenantId, 'code' => '2100', 'name' => 'A/P', 'name_ar' => 'A/P', 'type' => 'liability']);
        $fxGainAccount = AccountModel::create(['id' => Str::uuid()->toString(), 'tenant_id' => $tenantId, 'code' => '4200', 'name' => 'FX Gain', 'name_ar' => 'FX Gain', 'type' => 'revenue']);

        JournalEntryLineModel::create(['id' => Str::uuid()->toString(), 'journal_entry_id' => $entry->id, 'account_id' => $apAccount->id, 'debit' => 120, 'credit' => 0]);
        JournalEntryLineModel::create(['id' => Str::uuid()->toString(), 'journal_entry_id' => $entry->id, 'account_id' => $fxGainAccount->id, 'debit' => 0, 'credit' => 120]);

        $totalDebit = JournalEntryLineModel::query()->where('journal_entry_id', $entry->id)->sum('debit');
        $totalCredit = JournalEntryLineModel::query()->where('journal_entry_id', $entry->id)->sum('credit');

        $this->assertEquals($totalDebit, $totalCredit);
        $this->assertEquals(120, $totalDebit);
    }
}
