<?php

namespace App\Infrastructure\Eloquent\Models;

class JournalEntryModel extends BaseModel
{
    protected $table = 'journal_entries';
    protected $fillable = ['entry_number', 'date', 'description', 'is_posted', 'reference_type', 'reference_id', 'created_by', 'updated_by'];
    protected $casts = ['date' => 'date', 'is_posted' => 'boolean'];
    public function lines() { return $this->hasMany(JournalEntryLineModel::class, 'journal_entry_id'); }
}
