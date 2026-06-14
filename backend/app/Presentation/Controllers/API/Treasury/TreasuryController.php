<?php

namespace App\Presentation\Controllers\API\Treasury;

use App\Presentation\Controllers\API\BaseController;
use App\Infrastructure\Eloquent\Models\SafeModel;
use App\Infrastructure\Eloquent\Models\SafeTransactionModel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TreasuryController extends BaseController
{
    // GET /api/treasury/safes
    public function getSafes()
    {
        $safes = SafeModel::with('users')->get();
        return response()->json(['status' => 'success', 'data' => $safes]);
    }

    // POST /api/treasury/safes
    public function storeSafe(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'name_ar' => 'nullable|string|max:255',
            'type' => 'required|in:cash,bank',
            'balance' => 'nullable|numeric',
        ]);

        if (!isset($validated['balance'])) {
            $validated['balance'] = 0;
        }

        $safe = SafeModel::create($validated);
        return response()->json(['status' => 'success', 'data' => $safe], 201);
    }

    // POST /api/treasury/safes/{safe_id}/assign-user
    public function assignUser(Request $request, $safe_id)
    {
        $validated = $request->validate([
            'user_id' => 'required|uuid',
            'is_primary' => 'boolean'
        ]);

        $safe = SafeModel::findOrFail($safe_id);
        $safe->users()->syncWithoutDetaching([
            $validated['user_id'] => ['is_primary' => $validated['is_primary'] ?? false]
        ]);

        return response()->json(['status' => 'success', 'message' => 'User assigned successfully']);
    }

    // POST /api/treasury/transactions
    public function storeTransaction(Request $request)
    {
        $validated = $request->validate([
            'safe_id' => 'required|uuid|exists:tenant.safes,id',
            'type' => 'required|in:deposit,withdrawal',
            'amount' => 'required|numeric|min:0.01',
            'description' => 'nullable|string',
            'transaction_date' => 'nullable|date'
        ]);

        return DB::transaction(function () use ($validated) {
            $safe = SafeModel::lockForUpdate()->findOrFail($validated['safe_id']);

            if ($validated['type'] === 'withdrawal' && (float)$safe->balance < (float)$validated['amount']) {
                abort(400, 'Insufficient balance in safe.');
            }

            // Update safe balance
            $safe->balance = $validated['type'] === 'deposit' 
                             ? $safe->balance + $validated['amount'] 
                             : $safe->balance - $validated['amount'];
            $safe->save();

            $transaction = SafeTransactionModel::create([
                'safe_id' => $safe->id,
                'type' => $validated['type'],
                'amount' => $validated['amount'],
                'description' => $validated['description'] ?? '',
                'transaction_date' => $validated['transaction_date'] ?? now(),
                // 'created_by' => auth()->id() // Mocked for test
            ]);

            return response()->json(['status' => 'success', 'data' => $transaction], 201);
        });
    }

    // POST /api/treasury/transfer
    public function transfer(Request $request)
    {
        $validated = $request->validate([
            'from_safe_id' => 'required|uuid|exists:tenant.safes,id|different:to_safe_id',
            'to_safe_id' => 'required|uuid|exists:tenant.safes,id',
            'amount' => 'required|numeric|min:0.01',
            'description' => 'nullable|string',
        ]);

        return DB::transaction(function () use ($validated) {
            $fromSafe = SafeModel::lockForUpdate()->findOrFail($validated['from_safe_id']);
            $toSafe = SafeModel::lockForUpdate()->findOrFail($validated['to_safe_id']);

            if ((float)$fromSafe->balance < (float)$validated['amount']) {
                abort(400, 'Insufficient balance in source safe.');
            }

            // Deduct
            $fromSafe->balance -= $validated['amount'];
            $fromSafe->save();

            // Add
            $toSafe->balance += $validated['amount'];
            $toSafe->save();

            // Record Transfer Out
            SafeTransactionModel::create([
                'safe_id' => $fromSafe->id,
                'type' => 'transfer_out',
                'amount' => $validated['amount'],
                'description' => "Transfer to {$toSafe->name}. " . ($validated['description'] ?? ''),
                'reference_type' => 'transfer',
                'reference_id' => $toSafe->id,
                'transaction_date' => now()
            ]);

            // Record Transfer In
            SafeTransactionModel::create([
                'safe_id' => $toSafe->id,
                'type' => 'transfer_in',
                'amount' => $validated['amount'],
                'description' => "Transfer from {$fromSafe->name}. " . ($validated['description'] ?? ''),
                'reference_type' => 'transfer',
                'reference_id' => $fromSafe->id,
                'transaction_date' => now()
            ]);

            return response()->json(['status' => 'success', 'message' => 'Transfer completed']);
        });
    }
}
