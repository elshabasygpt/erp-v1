<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models\Accounting;

use App\Infrastructure\Eloquent\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class RecurringJournalEntryModel extends BaseModel
{
    use SoftDeletes;

    protected $table = 'recurring_journal_entries';

    protected $fillable = [
        'id', 'tenant_id', 'name', 'description', 'frequency', 'frequency_interval',
        'start_date', 'end_date', 'next_post_date', 'last_posted_date',
        'auto_post', 'is_active', 'occurrences_posted', 'max_occurrences', 'created_by',
    ];

    protected $casts = [
        'auto_post'           => 'boolean',
        'is_active'           => 'boolean',
        'start_date'          => 'date',
        'end_date'            => 'date',
        'next_post_date'      => 'date',
        'last_posted_date'    => 'date',
        'occurrences_posted'  => 'integer',
        'max_occurrences'     => 'integer',
        'frequency_interval'  => 'integer',
    ];

    public function lines(): HasMany
    {
        return $this->hasMany(RecurringJournalEntryLineModel::class, 'recurring_journal_entry_id');
    }

    /** Advance next_post_date by the configured frequency */
    public function advanceNextPostDate(): void
    {
        $interval = $this->frequency_interval ?? 1;
        $next = match ($this->frequency) {
            'daily'     => $this->next_post_date->addDays($interval),
            'weekly'    => $this->next_post_date->addWeeks($interval),
            'monthly'   => $this->next_post_date->addMonths($interval),
            'quarterly' => $this->next_post_date->addMonths($interval * 3),
            'yearly'    => $this->next_post_date->addYears($interval),
            default     => $this->next_post_date->addMonths($interval),
        };

        $this->update([
            'next_post_date'    => $next,
            'last_posted_date'  => now()->toDateString(),
            'occurrences_posted'=> $this->occurrences_posted + 1,
        ]);
    }

    public function isDue(): bool
    {
        if (!$this->is_active) return false;
        if ($this->end_date && now()->gt($this->end_date)) return false;
        if ($this->max_occurrences && $this->occurrences_posted >= $this->max_occurrences) return false;
        return now()->gte($this->next_post_date);
    }
}
