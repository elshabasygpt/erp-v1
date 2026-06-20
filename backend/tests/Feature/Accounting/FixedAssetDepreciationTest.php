<?php

namespace Tests\Feature\Accounting;

use App\Application\Accounting\UseCases\PostAssetDepreciationUseCase;
use App\Infrastructure\Eloquent\Models\AccountModel;
use App\Infrastructure\Eloquent\Models\FixedAssetDepreciationEntryModel;
use App\Infrastructure\Eloquent\Models\FixedAssetModel;
use App\Infrastructure\Eloquent\Models\JournalEntryLineModel;
use App\Infrastructure\Eloquent\Models\JournalEntryModel;
use Illuminate\Support\Str;
use Tests\TestCase;

class FixedAssetDepreciationTest extends TestCase
{
    public function test_posting_depreciation_creates_a_balanced_journal_entry()
    {
        $tenantId = Str::uuid()->toString();

        $expenseAccount = AccountModel::create(['id' => Str::uuid()->toString(), 'tenant_id' => $tenantId, 'code' => '5302', 'name' => 'Depreciation Expense', 'name_ar' => 'مصروف الإهلاك', 'type' => 'expense']);
        $accumulatedAccount = AccountModel::create(['id' => Str::uuid()->toString(), 'tenant_id' => $tenantId, 'code' => '1204', 'name' => 'Accumulated Depreciation', 'name_ar' => 'مجمع الإهلاك', 'type' => 'asset']);

        $asset = FixedAssetModel::create([
            'id' => Str::uuid()->toString(),
            'tenant_id' => $tenantId,
            'name' => 'Delivery Van',
            'purchase_date' => now()->subYear(),
            'purchase_cost' => 12000,
            'salvage_value' => 0,
            'useful_life_years' => 5,
            'accumulated_depreciation' => 0,
            'current_value' => 12000,
            'status' => 'active',
            'expense_account_id' => $expenseAccount->id,
            'depreciation_account_id' => $accumulatedAccount->id,
        ]);

        $useCase = app(PostAssetDepreciationUseCase::class);
        $entry = $useCase->execute($asset, new \DateTimeImmutable, null);

        $this->assertNotNull($entry);
        $this->assertInstanceOf(FixedAssetDepreciationEntryModel::class, $entry);

        $journal = JournalEntryModel::query()->findOrFail($entry->journal_entry_id);
        $lines = JournalEntryLineModel::query()->where('journal_entry_id', $journal->id)->get();

        $this->assertEquals($lines->sum('debit'), $lines->sum('credit'));
        $this->assertEqualsWithDelta(2400, $entry->amount, 0.5);

        $asset->refresh();
        $this->assertEqualsWithDelta(2400, (float) $asset->accumulated_depreciation, 0.5);
        $this->assertEqualsWithDelta(9600, (float) $asset->current_value, 0.5);

        // Posting again for the same date should be a no-op (no duplicate journal entry).
        $second = $useCase->execute($asset, new \DateTimeImmutable, null);
        $this->assertNull($second);
        $this->assertEquals(1, FixedAssetDepreciationEntryModel::query()->where('fixed_asset_id', $asset->id)->count());
    }
}
