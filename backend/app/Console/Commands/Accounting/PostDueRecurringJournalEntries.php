<?php

declare(strict_types=1);

namespace App\Console\Commands\Accounting;

use App\Infrastructure\Eloquent\Models\Accounting\RecurringJournalEntryModel;
use App\Infrastructure\Eloquent\Models\JournalEntryModel;
use App\Infrastructure\Eloquent\Models\JournalEntryLineModel;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PostDueRecurringJournalEntries extends Command
{
    protected $signature = 'accounting:post-recurring {--tenant= : Specific tenant ID to process}';
    protected $description = 'Auto-post all due recurring journal entries across all (or one) tenant(s)';

    public function handle(): int
    {
        $tenantFilter = $this->option('tenant');

        $query = RecurringJournalEntryModel::query()
            ->with('lines')
            ->where('is_active', true)
            ->where('next_post_date', '<=', now()->toDateString())
            ->where(fn($q) => $q->whereNull('end_date')->orWhere('end_date', '>=', now()->toDateString()));

        if ($tenantFilter) {
            $query->where('tenant_id', $tenantFilter);
        }

        $templates = $query->get();

        if ($templates->isEmpty()) {
            $this->info('No recurring journal entries due today.');
            return self::SUCCESS;
        }

        $posted  = 0;
        $skipped = 0;

        foreach ($templates as $template) {
            // Skip if max_occurrences reached
            if ($template->max_occurrences && $template->occurrences_posted >= $template->max_occurrences) {
                $template->update(['is_active' => false]);
                $skipped++;
                continue;
            }

            try {
                DB::connection('tenant')->transaction(function () use ($template) {
                    $tenantId    = $template->tenant_id;
                    $count       = JournalEntryModel::count() + 1;
                    $entryNumber = 'JE-REC-' . date('Y') . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);

                    $je = JournalEntryModel::create([
                        'id'             => Str::uuid()->toString(),
                        'tenant_id'      => $tenantId,
                        'entry_number'   => $entryNumber,
                        'date'           => now()->toDateString(),
                        'description'    => $template->name . ' (Auto-Recurring)',
                        'reference_type' => 'recurring',
                        'reference_id'   => $template->id,
                        'is_posted'      => $template->auto_post,
                        'created_by'     => 'system',
                    ]);

                    foreach ($template->lines as $line) {
                        JournalEntryLineModel::create([
                            'id'               => Str::uuid()->toString(),
                            'tenant_id'        => $tenantId,
                            'journal_entry_id' => $je->id,
                            'account_id'       => $line->account_id,
                            'debit'            => $line->debit,
                            'credit'           => $line->credit,
                            'description'      => $line->description,
                            'cost_center_id'   => $line->cost_center_id,
                        ]);
                    }

                    $template->advanceNextPostDate();
                });

                $this->info("Posted: {$template->name} (tenant: {$template->tenant_id})");
                $posted++;
            } catch (\Exception $e) {
                $this->error("Failed to post {$template->name}: {$e->getMessage()}");
                $skipped++;
            }
        }

        $this->info("Done. Posted: {$posted}, Skipped/Failed: {$skipped}");

        return self::SUCCESS;
    }
}
