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
    /**
     * Get all journal entries with eager loaded lines
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $entries = JournalEntryModel::with(['lines', 'lines.account'])
                ->orderBy('date', 'desc')
                ->orderBy('created_at', 'desc')
                ->paginate($request->get('per_page', 50));
                
            return $this->success($entries, 'Journal entries retrieved successfully');
        } catch (\Exception $e) {
            return $this->error('Failed to retrieve journal entries: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Show a single journal entry
     */
    public function show($id): JsonResponse
    {
        try {
            $entry = JournalEntryModel::with(['lines', 'lines.account'])->find($id);
            if (!$entry) {
                return $this->error('Journal entry not found', 404);
            }
            return $this->success($entry, 'Journal entry retrieved successfully');
        } catch (\Exception $e) {
            return $this->error('Failed to retrieve journal entry: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Create a new manual journal entry
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date' => 'required|date',
            'description' => 'required|string',
            'lines' => 'required|array|min:2',
            'lines.*.account_id' => 'required|uuid|exists:tenant.accounts,id',
            'lines.*.debit' => 'required|numeric|min:0',
            'lines.*.credit' => 'required|numeric|min:0',
            'lines.*.description' => 'nullable|string'
        ]);

        // Validate Balance
        $totalDebit = 0;
        $totalCredit = 0;
        foreach ($validated['lines'] as $line) {
            if ($line['debit'] > 0 && $line['credit'] > 0) {
                return $this->error('A single line cannot have both debit and credit amounts greater than 0.', 422);
            }
            if ($line['debit'] == 0 && $line['credit'] == 0) {
                return $this->error('Line must have either a debit or credit amount.', 422);
            }
            $totalDebit += (float) $line['debit'];
            $totalCredit += (float) $line['credit'];
        }

        // Use a small epsilon for floating point comparison if needed, or round to 2 decimals
        if (round($totalDebit, 6) !== round($totalCredit, 6)) {
            return $this->error('Journal entry is out of balance. Total Debits must equal Total Credits.', 422);
        }

        try {
            DB::connection('tenant')->beginTransaction();

            $tenantId = app()->has('current_tenant') ? app('current_tenant')->id : null;

            // Generate entry number
            $count = JournalEntryModel::count() + 1;
            $entryNumber = 'JE-' . date('Y') . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);

            // Create Header
            $entry = JournalEntryModel::create([
                'tenant_id' => $tenantId,
                'entry_number' => $entryNumber,
                'date' => $validated['date'],
                'description' => $validated['description'],
                'is_posted' => true, // Manual entries can be posted automatically, or we can make it draft based on preferences. We'll set to true for now.
                'created_by' => $request->user()->id ?? null,
            ]);

            // Create Lines
            foreach ($validated['lines'] as $lineData) {
                JournalEntryLineModel::create([
                    'tenant_id' => $tenantId,
                    'journal_entry_id' => $entry->id,
                    'account_id' => $lineData['account_id'],
                    'debit' => $lineData['debit'],
                    'credit' => $lineData['credit'],
                    'description' => $lineData['description'] ?? null,
                ]);
            }

            DB::connection('tenant')->commit();

            return $this->success($entry->load(['lines', 'lines.account']), 'Journal entry created successfully', 201);
        } catch (\Exception $e) {
            DB::connection('tenant')->rollBack();
            return $this->error('Failed to create journal entry: ' . $e->getMessage(), 500);
        }
    }
}
