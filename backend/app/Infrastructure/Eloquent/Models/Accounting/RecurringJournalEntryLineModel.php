<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models\Accounting;

use App\Infrastructure\Eloquent\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RecurringJournalEntryLineModel extends BaseModel
{
    protected $table = 'recurring_journal_entry_lines';

    protected $fillable = [
        'id', 'recurring_journal_entry_id', 'tenant_id',
        'account_id', 'debit', 'credit', 'description', 'cost_center_id',
    ];

    protected $casts = [
        'debit'  => 'decimal:6',
        'credit' => 'decimal:6',
    ];

    public function recurringEntry(): BelongsTo
    {
        return $this->belongsTo(RecurringJournalEntryModel::class, 'recurring_journal_entry_id');
    }
}
