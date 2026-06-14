<?php

namespace App\Presentation\Controllers\API\Treasury;

use App\Presentation\Controllers\API\BaseController;
use App\Infrastructure\Eloquent\Models\ExpenseCategoryModel;
use App\Infrastructure\Eloquent\Models\ExpenseModel;
use App\Infrastructure\Eloquent\Models\SafeModel;
use App\Infrastructure\Eloquent\Models\SafeTransactionModel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ExpenseController extends BaseController
{
    // GET /api/expenses/categories
    public function getCategories()
    {
        $categories = ExpenseCategoryModel::all();
        return response()->json(['status' => 'success', 'data' => $categories]);
    }

    // POST /api/expenses/categories
    public function storeCategory(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'name_ar' => 'nullable|string|max:255',
            'is_advance_or_salary' => 'boolean'
        ]);

        $category = ExpenseCategoryModel::create($validated);
        return response()->json(['status' => 'success', 'data' => $category], 201);
    }

    // GET /api/expenses
    public function index(Request $request)
    {
        $expenses = ExpenseModel::with(['category', 'safe'])->orderBy('expense_date', 'desc')->get();
        return response()->json(['status' => 'success', 'data' => $expenses]);
    }

    // POST /api/expenses
    public function store(Request $request)
    {
        $validated = $request->validate([
            'category_id' => 'required|uuid|exists:tenant.expense_categories,id',
            'safe_id' => 'required|uuid|exists:tenant.safes,id',
            'amount' => 'required|numeric|min:0.01',
            'description' => 'nullable|string',
            'expense_date' => 'nullable|date'
        ]);

        return DB::transaction(function () use ($validated) {
            $safe = SafeModel::lockForUpdate()->findOrFail($validated['safe_id']);

            if ((float)$safe->balance < (float)$validated['amount']) {
                abort(400, 'Insufficient balance in safe to pay this expense.');
            }

            // Deduct from safe
            $safe->balance -= $validated['amount'];
            $safe->save();

            // Create Expense record
            $expense = ExpenseModel::create([
                'category_id' => $validated['category_id'],
                'safe_id' => $safe->id,
                'amount' => $validated['amount'],
                'description' => $validated['description'] ?? '',
                'expense_date' => $validated['expense_date'] ?? now(),
            ]);

            // Register transaction
            SafeTransactionModel::create([
                'safe_id' => $safe->id,
                'type' => 'withdrawal',
                'amount' => $validated['amount'],
                'description' => 'Expense: ' . ($validated['description'] ?? ''),
                'reference_type' => 'expense',
                'reference_id' => $expense->id,
                'transaction_date' => $expense->expense_date
            ]);

            return response()->json(['status' => 'success', 'data' => $expense], 201);
        });
    }
}
