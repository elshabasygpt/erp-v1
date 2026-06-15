<?php

namespace App\Presentation\Controllers\API\Treasury;

use App\Presentation\Controllers\API\BaseTenantController;
use App\Infrastructure\Eloquent\Models\ExpenseCategoryModel;
use App\Infrastructure\Eloquent\Models\ExpenseModel;
use App\Infrastructure\Eloquent\Models\SafeModel;
use App\Infrastructure\Eloquent\Models\SafeTransactionModel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ExpenseController extends BaseTenantController
{
    // GET /api/expenses/categories
    public function getCategories(Request $request)
    {
        $tenantId = $this->getTenantId($request);
        $categories = ExpenseCategoryModel::where('tenant_id', $tenantId)->get();
        return response()->json(['status' => 'success', 'data' => $categories]);
    }

    // POST /api/expenses/categories
    public function storeCategory(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'name_ar' => 'nullable|string|max:255',
            'is_advance_or_salary' => 'boolean'
        ]);

        $data['tenant_id'] = $this->getTenantId($request);
        $data['id'] = \Illuminate\Support\Str::uuid()->toString();

        $category = ExpenseCategoryModel::create($data);
        return response()->json(['status' => 'success', 'data' => $category], 201);
    }

    // GET /api/expenses
    public function index(Request $request)
    {
        $tenantId = $this->getTenantId($request);
        $expenses = ExpenseModel::with(['category', 'safe'])->where('tenant_id', $tenantId)->orderBy('expense_date', 'desc')->get();
        return response()->json(['status' => 'success', 'data' => $expenses]);
    }

    // POST /api/expenses
    public function store(Request $request)
    {
        $data = $request->validate([
            'category_id' => 'required|uuid|exists:tenant.expense_categories,id',
            'safe_id' => 'required|uuid|exists:tenant.safes,id',
            'amount' => 'required|numeric|min:0.01',
            'description' => 'nullable|string',
            'expense_date' => 'nullable|date'
        ]);

        $tenantId = $this->getTenantId($request);

        return DB::transaction(function () use ($data, $tenantId, $request) {
            $safe = SafeModel::lockForUpdate()->findOrFail($data['safe_id']);
            $this->assertBelongsToTenant($safe, $request);

            if ((float)$safe->balance < (float)$data['amount']) {
                abort(400, 'Insufficient balance in safe to pay this expense.');
            }

            // Deduct from safe
            $safe->balance -= $data['amount'];
            $safe->save();

            // Create Expense record
            $expense = ExpenseModel::create([
                'id' => \Illuminate\Support\Str::uuid()->toString(),
                'tenant_id' => $tenantId,
                'category_id' => $data['category_id'],
                'safe_id' => $safe->id,
                'amount' => $data['amount'],
                'description' => $data['description'] ?? '',
                'expense_date' => $data['expense_date'] ?? now(),
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

