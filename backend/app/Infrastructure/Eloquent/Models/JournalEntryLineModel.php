<?php

namespace App\Infrastructure\Eloquent\Models;

class JournalEntryLineModel extends BaseModel
{
    protected $table = 'journal_entry_lines';
    protected $fillable = ['journal_entry_id', 'account_id', 'debit', 'credit', 'description', 'cost_center_id', 'project_id', 'transaction_debit', 'transaction_credit'];
    protected $casts = ['debit' => 'decimal:2', 'credit' => 'decimal:2', 'transaction_debit' => 'decimal:2', 'transaction_credit' => 'decimal:2'];
    public function journalEntry() { return $this->belongsTo(JournalEntryModel::class, 'journal_entry_id'); }
    public function account() { return $this->belongsTo(AccountModel::class, 'account_id'); }
}
