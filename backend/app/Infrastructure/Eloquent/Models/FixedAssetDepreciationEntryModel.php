<?php

namespace App\Infrastructure\Eloquent\Models;

class FixedAssetDepreciationEntryModel extends BaseModel
{
    protected $table = 'fixed_asset_depreciation_entries';

    protected $guarded = ['id'];

    public $timestamps = true;

    protected $casts = [
        'period_start' => 'date',
        'period_end' => 'date',
    ];

    public function fixedAsset()
    {
        return $this->belongsTo(FixedAssetModel::class, 'fixed_asset_id');
    }

    public function journalEntry()
    {
        return $this->belongsTo(JournalEntryModel::class, 'journal_entry_id');
    }
}
