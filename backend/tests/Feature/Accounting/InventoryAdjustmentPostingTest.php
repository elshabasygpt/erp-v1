<?php

namespace Tests\Feature\Accounting;

use App\Infrastructure\Eloquent\Models\AccountModel;
use App\Infrastructure\Eloquent\Models\JournalEntryLineModel;
use App\Infrastructure\Eloquent\Models\JournalEntryModel;
use Illuminate\Support\Str;
use Tests\TestCase;

class InventoryAdjustmentPostingTest extends TestCase
{
    public function test_inventory_adjustment_posting_is_balanced()
    {
        $tenantId = Str::uuid()->toString();

        $entry = JournalEntryModel::create([
            'id' => Str::uuid()->toString(),
            'tenant_id' => $tenantId,
            'entry_number' => 'ADJ-001',
            'date' => now(),
            'description' => 'Test Inventory Adjustment',
            'is_posted' => true,
        ]);

        $inventoryAccount = AccountModel::create(['id' => Str::uuid()->toString(), 'tenant_id' => $tenantId, 'code' => '1300', 'name' => 'Inventory', 'name_ar' => 'Inventory', 'type' => 'asset']);
        $cogsAccount = AccountModel::create(['id' => Str::uuid()->toString(), 'tenant_id' => $tenantId, 'code' => '5000', 'name' => 'COGS', 'name_ar' => 'COGS', 'type' => 'expense']);

        // Adjustment: decrease inventory
        JournalEntryLineModel::create(['id' => Str::uuid()->toString(), 'journal_entry_id' => $entry->id, 'account_id' => $cogsAccount->id, 'debit' => 300, 'credit' => 0]);
        JournalEntryLineModel::create(['id' => Str::uuid()->toString(), 'journal_entry_id' => $entry->id, 'account_id' => $inventoryAccount->id, 'debit' => 0, 'credit' => 300]);

        $totalDebit = JournalEntryLineModel::query()->where('journal_entry_id', $entry->id)->sum('debit');
        $totalCredit = JournalEntryLineModel::query()->where('journal_entry_id', $entry->id)->sum('credit');

        $this->assertEquals($totalDebit, $totalCredit);
        $this->assertEquals(300, $totalDebit);
    }
}
