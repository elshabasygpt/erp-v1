<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Accounting;

use App\Infrastructure\Eloquent\Models\Accounting\RecurringJournalEntryModel;
use App\Infrastructure\Eloquent\Models\Accounting\RecurringJournalEntryLineModel;
use App\Infrastructure\Eloquent\Models\JournalEntryModel;
use App\Infrastructure\Eloquent\Models\JournalEntryLineModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class RecurringJournalEntryController extends BaseTenantController
{
    public function index(Request $request): JsonResponse
    {
        $entries = RecurringJournalEntryModel::query()
            ->where('tenant_id', $this->getTenantId($request))
            ->with('lines')
            ->when($request->has('active'), fn($q) => $q->where('is_active', true))
            ->orderBy('name')
            ->get();

        return $this->success($entries);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'               => 'required|string|max:255',
            'description'        => 'nullable|string',
            'frequency'          => 'required|in:daily,weekly,monthly,quarterly,yearly',
            'frequency_interval' => 'nullable|integer|min:1',
            'start_date'         => 'required|date',
            'end_date'           => 'nullable|date|after:start_date',
            'auto_post'          => 'nullable|boolean',
            'max_occurrences'    => 'nullable|integer|min:1',
            'lines'              => 'required|array|min:2',
            'lines.*.account_id' => 'required|uuid|exists:tenant.accounts,id',
            'lines.*.debit'      => 'required|numeric|min:0',
            'lines.*.credit'     => 'required|numeric|min:0',
            'lines.*.description'=> 'nullable|string',
        ]);

        // Validate balanced lines
        $totalDebit = array_sum(array_column($validated['lines'], 'debit'));
        $totalCredit = array_sum(array_column($validated['lines'], 'credit'));
        if (round($totalDebit, 6) !== round($totalCredit, 6)) {
            return $this->error('Template lines are out of balance.', 422);
        }

        DB::connection('tenant')->beginTransaction();
        try {
            $tenantId = (string) $this->getTenantId($request);

            $template = RecurringJournalEntryModel::query()->create([
                'id'                 => Str::uuid()->toString(),
                'tenant_id'          => $tenantId,
                'name'               => $validated['name'],
                'description'        => $validated['description'] ?? null,
                'frequency'          => $validated['frequency'],
                'frequency_interval' => $validated['frequency_interval'] ?? 1,
                'start_date'         => $validated['start_date'],
                'end_date'           => $validated['end_date'] ?? null,
                'next_post_date'     => $validated['start_date'],
                'auto_post'          => $validated['auto_post'] ?? false,
                'max_occurrences'    => $validated['max_occurrences'] ?? null,
                'is_active'          => true,
                'created_by'         => auth()->id(),
            ]);

            foreach ($validated['lines'] as $line) {
                RecurringJournalEntryLineModel::query()->create([
                    'id'                           => Str::uuid()->toString(),
                    'recurring_journal_entry_id'   => $template->id,
                    'tenant_id'                    => $tenantId,
                    'account_id'                   => $line['account_id'],
                    'debit'                        => $line['debit'],
                    'credit'                       => $line['credit'],
                    'description'                  => $line['description'] ?? null,
                ]);
            }

            DB::connection('tenant')->commit();

            return $this->success($template->load('lines'), 'Recurring journal entry template created', 201);
        } catch (\Exception $e) {
            DB::connection('tenant')->rollBack();
            return $this->error('Failed to create template: ' . $e->getMessage(), 500);
        }
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $template = RecurringJournalEntryModel::query()
            ->where('tenant_id', $this->getTenantId($request))
            ->with('lines')
            ->findOrFail($id);

        return $this->success($template);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $template = RecurringJournalEntryModel::query()
            ->where('tenant_id', $this->getTenantId($request))
            ->findOrFail($id);

        $validated = $request->validate([
            'name'               => 'sometimes|required|string|max:255',
            'description'        => 'nullable|string',
            'end_date'           => 'nullable|date',
            'auto_post'          => 'nullable|boolean',
            'is_active'          => 'nullable|boolean',
            'max_occurrences'    => 'nullable|integer|min:1',
        ]);

        $template->update($validated);

        return $this->success($template->fresh('lines'), 'Template updated successfully');
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $template = RecurringJournalEntryModel::query()
            ->where('tenant_id', $this->getTenantId($request))
            ->findOrFail($id);

        $template->delete();

        return $this->success(null, 'Template deleted successfully');
    }

    /** Manually trigger posting a due recurring entry now */
    public function postNow(Request $request, string $id): JsonResponse
    {
        $template = RecurringJournalEntryModel::query()
            ->where('tenant_id', $this->getTenantId($request))
            ->with('lines')
            ->findOrFail($id);

        if (!$template->is_active) {
            return $this->error('Template is inactive.', 422);
        }

        try {
            $je = $this->postTemplate($template, (string) $this->getTenantId($request));
            return $this->success($je->load('lines'), 'Journal entry posted from template', 201);
        } catch (\Exception $e) {
            return $this->error('Failed to post: ' . $e->getMessage(), 500);
        }
    }

    private function postTemplate(RecurringJournalEntryModel $template, string $tenantId): JournalEntryModel
    {
        return DB::connection('tenant')->transaction(function () use ($template, $tenantId) {
            $count       = JournalEntryModel::count() + 1;
            $entryNumber = 'JE-REC-' . date('Y') . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);

            $je = JournalEntryModel::create([
                'id'             => Str::uuid()->toString(),
                'tenant_id'      => $tenantId,
                'entry_number'   => $entryNumber,
                'date'           => now()->toDateString(),
                'description'    => $template->name . ' (Recurring)',
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

            return $je;
        });
    }
}
