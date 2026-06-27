<?php

namespace App\Presentation\Controllers\API\Accounting;

use App\Presentation\Controllers\API\BaseController;
use App\Infrastructure\Eloquent\Models\JournalEntryModel;
use App\Infrastructure\Eloquent\Models\JournalEntryLineModel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class JournalEntryController extends BaseController
{
    public function index(Request $request): JsonResponse
    {
        try {
            $query = JournalEntryModel::with(['lines', 'lines.account'])
                ->orderBy('date', 'desc')
                ->orderBy('created_at', 'desc');

            if ($request->has('is_posted')) {
                $query->where('is_posted', filter_var($request->get('is_posted'), FILTER_VALIDATE_BOOLEAN));
            }
            if ($request->has('from')) {
                $query->whereDate('date', '>=', $request->get('from'));
            }
            if ($request->has('to')) {
                $query->whereDate('date', '<=', $request->get('to'));
            }

            return $this->success($query->paginate($request->get('per_page', 50)));
        } catch (\Exception $e) {
            return $this->error('Failed to retrieve journal entries: ' . $e->getMessage(), 500);
        }
    }

    public function show($id): JsonResponse
    {
        try {
            $entry = JournalEntryModel::with(['lines', 'lines.account'])->find($id);
            if (!$entry) {
                return $this->error('Journal entry not found', 404);
            }
            return $this->success($entry);
        } catch (\Exception $e) {
            return $this->error('Failed to retrieve journal entry: ' . $e->getMessage(), 500);
        }
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date'                  => 'required|date',
            'description'           => 'required|string',
            'auto_post'             => 'nullable|boolean',
            'lines'                 => 'required|array|min:2',
            'lines.*.account_id'   => 'required|uuid|exists:tenant.accounts,id',
            'lines.*.debit'        => 'required|numeric|min:0',
            'lines.*.credit'       => 'required|numeric|min:0',
            'lines.*.description'  => 'nullable|string',
        ]);

        $totalDebit = 0;
        $totalCredit = 0;
        foreach ($validated['lines'] as $line) {
            if ($line['debit'] > 0 && $line['credit'] > 0) {
                return $this->error('A line cannot have both debit and credit amounts.', 422);
            }
            if ($line['debit'] == 0 && $line['credit'] == 0) {
                return $this->error('Each line must have either a debit or credit amount.', 422);
            }
            $totalDebit  += (float) $line['debit'];
            $totalCredit += (float) $line['credit'];
        }

        if (round($totalDebit, 6) !== round($totalCredit, 6)) {
            return $this->error('Journal entry is out of balance. Total Debits must equal Total Credits.', 422);
        }

        try {
            DB::connection('tenant')->beginTransaction();

            $tenantId    = app()->has('current_tenant') ? app('current_tenant')->id : null;
            $count       = JournalEntryModel::count() + 1;
            $entryNumber = 'JE-' . date('Y') . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);
            $isPosted    = (bool) ($validated['auto_post'] ?? false);

            $entry = JournalEntryModel::create([
                'tenant_id'   => $tenantId,
                'entry_number'=> $entryNumber,
                'date'        => $validated['date'],
                'description' => $validated['description'],
                'is_posted'   => $isPosted,
                'created_by'  => $request->user()->id ?? null,
            ]);

            foreach ($validated['lines'] as $lineData) {
                JournalEntryLineModel::create([
                    'tenant_id'        => $tenantId,
                    'journal_entry_id' => $entry->id,
                    'account_id'       => $lineData['account_id'],
                    'debit'            => $lineData['debit'],
                    'credit'           => $lineData['credit'],
                    'description'      => $lineData['description'] ?? null,
                ]);
            }

            DB::connection('tenant')->commit();

            return $this->success(
                $entry->load(['lines', 'lines.account']),
                'Journal entry created' . ($isPosted ? ' and posted' : ' as draft'),
                201
            );
        } catch (\Exception $e) {
            DB::connection('tenant')->rollBack();
            return $this->error('Failed to create journal entry: ' . $e->getMessage(), 500);
        }
    }

    /** Post a draft journal entry */
    public function post(string $id): JsonResponse
    {
        try {
            $entry = JournalEntryModel::findOrFail($id);

            if ($entry->is_posted) {
                return $this->error('Journal entry is already posted.', 422);
            }

            $entry->update([
                'is_posted' => true,
                'posted_at' => now(),
                'posted_by' => auth()->id(),
            ]);

            return $this->success($entry->fresh()->load(['lines', 'lines.account']), 'Journal entry posted successfully');
        } catch (\Exception $e) {
            return $this->error('Failed to post journal entry: ' . $e->getMessage(), 500);
        }
    }

    /** Create a reversing entry (swaps debits/credits) for a posted journal entry */
    public function reverse(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'date'        => 'required|date',
            'description' => 'nullable|string',
            'auto_post'   => 'nullable|boolean',
        ]);

        try {
            $original = JournalEntryModel::with('lines')->findOrFail($id);

            if (!$original->is_posted) {
                return $this->error('Only posted entries can be reversed.', 422);
            }

            $alreadyReversed = JournalEntryModel::where('reference_type', 'reversal')
                ->where('reference_id', $id)
                ->exists();

            if ($alreadyReversed) {
                return $this->error('A reversing entry already exists for this journal entry.', 422);
            }

            DB::connection('tenant')->beginTransaction();

            $tenantId    = app()->has('current_tenant') ? app('current_tenant')->id : null;
            $count       = JournalEntryModel::count() + 1;
            $entryNumber = 'JE-REV-' . date('Y') . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);
            $isPosted    = (bool) ($validated['auto_post'] ?? false);

            $reversal = JournalEntryModel::create([
                'tenant_id'      => $tenantId,
                'entry_number'   => $entryNumber,
                'date'           => $validated['date'],
                'description'    => $validated['description'] ?? 'Reversal of ' . $original->entry_number,
                'reference_type' => 'reversal',
                'reference_id'   => $id,
                'is_posted'      => $isPosted,
                'created_by'     => auth()->id(),
            ]);

            foreach ($original->lines as $line) {
                JournalEntryLineModel::create([
                    'tenant_id'        => $tenantId,
                    'journal_entry_id' => $reversal->id,
                    'account_id'       => $line->account_id,
                    'debit'            => $line->credit,  // swapped
                    'credit'           => $line->debit,   // swapped
                    'description'      => 'Reversal: ' . ($line->description ?? ''),
                ]);
            }

            DB::connection('tenant')->commit();

            return $this->success(
                $reversal->load(['lines', 'lines.account']),
                'Reversing entry created' . ($isPosted ? ' and posted' : ' as draft'),
                201
            );
        } catch (\Exception $e) {
            DB::connection('tenant')->rollBack();
            return $this->error('Failed to create reversing entry: ' . $e->getMessage(), 500);
        }
    }
}
