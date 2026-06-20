<?php

namespace App\Infrastructure\Eloquent\Models;

class JournalEntryLineModel extends BaseModel
{
    protected $table = 'journal_entry_lines';

    protected $fillable = ['id', 'tenant_id', 'journal_entry_id', 'account_id', 'debit', 'credit', 'description', 'cost_center_id', 'project_id', 'transaction_debit', 'transaction_credit'];

    protected $casts = ['debit' => 'decimal:6', 'credit' => 'decimal:6', 'transaction_debit' => 'decimal:6', 'transaction_credit' => 'decimal:6'];

    protected static function booted()
    {
        parent::booted();

        // Financial Integrity Guard: Prevent modification of posted journal lines
        static::updating(function ($line) {
            if ($line->journalEntry && $line->journalEntry->is_posted) {
                throw new \DomainException('Immutable Record: Cannot modify a posted journal entry line. You must reverse the entry instead.');
            }
        });

        static::deleting(function ($line) {
            if ($line->journalEntry && $line->journalEntry->is_posted) {
                throw new \DomainException('Immutable Record: Cannot delete a posted journal entry line. You must reverse the entry instead.');
            }
        });
    }

    public function journalEntry()
    {
        return $this->belongsTo(JournalEntryModel::class, 'journal_entry_id');
    }

    public function account()
    {
        return $this->belongsTo(AccountModel::class, 'account_id');
    }
}
