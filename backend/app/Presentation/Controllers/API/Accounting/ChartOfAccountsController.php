<?php

namespace App\Presentation\Controllers\API\Accounting;

use App\Presentation\Controllers\API\BaseController;
use App\Infrastructure\Eloquent\Models\AccountModel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ChartOfAccountsController extends BaseController
{
    /**
     * Get all accounts as a flat list
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $accounts = AccountModel::with('parent')
                ->orderBy('code')
                ->get();
                
            return $this->success($accounts, 'Chart of accounts retrieved successfully');
        } catch (\Exception $e) {
            return $this->error('Failed to retrieve accounts: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get accounts formatted as a nested tree
     */
    public function tree(Request $request): JsonResponse
    {
        try {
            // Get all accounts
            $accounts = AccountModel::query()->orderBy('code')->get();
            
            // Fetch live balances from journal entry lines
            // We sum all debits and credits per account_id
            $table = 'journal_entry_lines';
            $accId = 'account_id';
            $balances = DB::connection('tenant')
                ->table($table)
                ->select($accId, DB::raw('SUM(debit) as total_debit'), DB::raw('SUM(credit) as total_credit'))
                ->groupBy($accId)
                ->get()
                ->keyBy($accId);

            // Map base balances to accounts
            foreach ($accounts as $account) {
                $b = $balances->get($account->id);
                $debit = $b ? (float) $b->total_debit : 0;
                $credit = $b ? (float) $b->total_credit : 0;
                
                // Normal Balance Rules
                if (in_array($account->type, ['asset', 'expense'])) {
                    $account->direct_balance = $debit - $credit;
                } else {
                    $account->direct_balance = $credit - $debit;
                }
                
                // Add direct debit and credit
                $account->direct_debit = $debit;
                $account->direct_credit = $credit;

                // Initialize total fields
                $account->total_debit = $account->direct_debit;
                $account->total_credit = $account->direct_credit;
                $account->total_balance = $account->direct_balance;
            }

            // Build the tree
            $tree = $this->buildTree($accounts);

            return $this->success($tree, 'Chart of accounts tree retrieved successfully');
        } catch (\Exception $e) {
            return $this->error('Failed to retrieve accounts tree: ' . $e->getMessage(), 500);
        }
    }

    private function buildTree($elements, $parentId = null) 
    {
        $branch = array();
    
        foreach ($elements as $element) {
            if ($element->parent_id == $parentId) {
                $children = $this->buildTree($elements, $element->id);
                
                $childBalanceSum = 0;
                $childDebitSum = 0;
                $childCreditSum = 0;

                if ($children) {
                    $element['children'] = $children;
                    // Sum up the total balances of all direct children
                    foreach ($children as $child) {
                        $childBalanceSum += $child['total_balance'];
                        $childDebitSum += $child['total_debit'];
                        $childCreditSum += $child['total_credit'];
                    }
                } else {
                    $element['children'] = [];
                }
                
                // The total balance of this account is its direct balance + children's total balances
                $element['total_balance'] = $element['direct_balance'] + $childBalanceSum;
                $element['total_debit'] = $element['direct_debit'] + $childDebitSum;
                $element['total_credit'] = $element['direct_credit'] + $childCreditSum;
                
                $branch[] = $element;
            }
        }
    
        return $branch;
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => 'required|string|unique:tenant.accounts,code',
            'name' => 'required|string|max:255',
            'name_ar' => 'required|string|max:255',
            'type' => 'required|in:asset,liability,equity,revenue,expense',
            'parent_id' => 'nullable|uuid|exists:tenant.accounts,id',
            'is_active' => 'boolean',
            'description' => 'nullable|string'
        ]);

        try {
            // Determine level
            $level = 1;
            if (!empty($validated['parent_id'])) {
                $parent = AccountModel::find($validated['parent_id']);
                if ($parent) {
                    $level = $parent->level + 1;
                    // Ensure child inherits parent type for consistency
                    $validated['type'] = $parent->type;
                }
            }

            $validated['level'] = $level;
            $validated['created_by'] = $request->user()->id ?? null;
            $validated['tenant_id'] = app()->has('current_tenant') ? app('current_tenant')->id : null;

            $account = AccountModel::create($validated);

            return $this->success($account, 'Account created successfully', 201);
        } catch (\Exception $e) {
            return $this->error('Failed to create account: ' . $e->getMessage(), 500);
        }
    }

    public function update(Request $request, $id): JsonResponse
    {
        $account = AccountModel::find($id);
        
        if (!$account) {
            return $this->error('Account not found', 404);
        }

        $validated = $request->validate([
            'code' => 'string|unique:tenant.accounts,code,' . $id,
            'name' => 'string|max:255',
            'name_ar' => 'string|max:255',
            'is_active' => 'boolean',
            'description' => 'nullable|string'
        ]);

        try {
            $validated['updated_by'] = $request->user()->id ?? null;
            
            $account->update($validated);

            return $this->success($account, 'Account updated successfully');
        } catch (\Exception $e) {
            return $this->error('Failed to update account: ' . $e->getMessage(), 500);
        }
    }

    public function destroy($id): JsonResponse
    {
        $account = AccountModel::find($id);
        
        if (!$account) {
            return $this->error('Account not found', 404);
        }

        try {
            // Check if it has children
            $hasChildren = AccountModel::query()->where('parent_id', '=', $id)->exists();
            if ($hasChildren) {
                return $this->error('Cannot delete account with sub-accounts', 400);
            }

            // Check if it has journal lines (using raw query because JournalEntryLineModel might be in different namespace)
            $table = 'journal_entry_lines';
            $hasTransactions = DB::connection('tenant')
                ->table($table)
                ->where('account_id', '=', $id)
                ->exists();

            if ($hasTransactions) {
                return $this->error('Cannot delete account with existing transactions', 400);
            }

            $account->delete();

            return $this->success(null, 'Account deleted successfully');
        } catch (\Exception $e) {
            return $this->error('Failed to delete account: ' . $e->getMessage(), 500);
        }
    }
}
