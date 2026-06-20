<?php

namespace App\Infrastructure\Eloquent\Models;

class JournalEntryModel extends BaseModel
{
    protected $table = 'journal_entries';

    protected $fillable = ['id', 'tenant_id', 'entry_number', 'date', 'description', 'is_posted', 'reference_type', 'reference_id', 'created_by', 'updated_by', 'transaction_currency_id', 'exchange_rate'];

    protected $casts = ['date' => 'date', 'is_posted' => 'boolean', 'exchange_rate' => 'decimal:6'];

    public function lines()
    {
        return $this->hasMany(JournalEntryLineModel::class, 'journal_entry_id');
    }
}
