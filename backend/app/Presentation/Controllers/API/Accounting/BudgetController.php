<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Accounting;

use App\Infrastructure\Eloquent\Models\AccountModel;
use App\Infrastructure\Eloquent\Models\BudgetItemModel;
use App\Infrastructure\Eloquent\Models\BudgetModel;
use App\Infrastructure\Eloquent\Models\JournalEntryLineModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BudgetController extends BaseTenantController
{
    public function index(Request $request): JsonResponse
    {
        $budgets = BudgetModel::query()
            ->where('tenant_id', $this->getTenantId($request))
            ->withCount('items')
            ->orderByDesc('period_start')
            ->get();

        return $this->success($budgets);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $budget = BudgetModel::query()
            ->where('tenant_id', $this->getTenantId($request))
            ->with(['items.account:id,code,name,name_ar,type'])
            ->findOrFail($id);

        return $this->success($budget);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'         => 'required|string|max:255',
            'fiscal_year'  => 'required|string|max:10',
            'period_start' => 'required|date',
            'period_end'   => 'required|date|after:period_start',
            'notes'        => 'nullable|string',
            'items'        => 'array',
            'items.*.account_id'    => 'required|uuid',
            'items.*.cost_center_id'=> 'nullable|uuid',
            'items.*.jan' => 'numeric|min:0', 'items.*.feb' => 'numeric|min:0',
            'items.*.mar' => 'numeric|min:0', 'items.*.apr' => 'numeric|min:0',
            'items.*.may' => 'numeric|min:0', 'items.*.jun' => 'numeric|min:0',
            'items.*.jul' => 'numeric|min:0', 'items.*.aug' => 'numeric|min:0',
            'items.*.sep' => 'numeric|min:0', 'items.*.oct' => 'numeric|min:0',
            'items.*.nov' => 'numeric|min:0', 'items.*.dec' => 'numeric|min:0',
            'items.*.notes' => 'nullable|string',
        ]);

        $budget = DB::connection('tenant')->transaction(function () use ($validated, $request) {
            $budget = BudgetModel::create([
                'id'           => Str::uuid()->toString(),
                'tenant_id'    => $this->getTenantId($request),
                'name'         => $validated['name'],
                'fiscal_year'  => $validated['fiscal_year'],
                'period_start' => $validated['period_start'],
                'period_end'   => $validated['period_end'],
                'notes'        => $validated['notes'] ?? null,
                'status'       => 'draft',
                'created_by'   => auth()->id(),
            ]);

            foreach ($validated['items'] ?? [] as $item) {
                $months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
                $total  = array_sum(array_map(fn($m) => (float) ($item[$m] ?? 0), $months));
                BudgetItemModel::create(array_merge(
                    ['id' => Str::uuid()->toString(), 'budget_id' => $budget->id],
                    array_fill_keys($months, 0),
                    $item,
                    ['total' => $total]
                ));
            }

            return $budget->load('items.account:id,code,name,name_ar');
        });

        return $this->success($budget, 'Budget created', 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $budget = BudgetModel::query()
            ->where('tenant_id', $this->getTenantId($request))
            ->where('status', '!=', 'closed')
            ->findOrFail($id);

        $validated = $request->validate([
            'name'         => 'sometimes|string|max:255',
            'notes'        => 'nullable|string',
            'status'       => 'sometimes|in:draft,approved,closed',
            'items'        => 'sometimes|array',
            'items.*.account_id'    => 'required_with:items|uuid',
            'items.*.cost_center_id'=> 'nullable|uuid',
            'items.*.jan' => 'numeric|min:0', 'items.*.feb' => 'numeric|min:0',
            'items.*.mar' => 'numeric|min:0', 'items.*.apr' => 'numeric|min:0',
            'items.*.may' => 'numeric|min:0', 'items.*.jun' => 'numeric|min:0',
            'items.*.jul' => 'numeric|min:0', 'items.*.aug' => 'numeric|min:0',
            'items.*.sep' => 'numeric|min:0', 'items.*.oct' => 'numeric|min:0',
            'items.*.nov' => 'numeric|min:0', 'items.*.dec' => 'numeric|min:0',
            'items.*.notes' => 'nullable|string',
        ]);

        DB::connection('tenant')->transaction(function () use ($budget, $validated) {
            $budget->update(array_filter([
                'name'   => $validated['name']   ?? null,
                'notes'  => $validated['notes']  ?? null,
                'status' => $validated['status'] ?? null,
                'approved_by' => ($validated['status'] ?? null) === 'approved' ? auth()->id() : null,
                'approved_at' => ($validated['status'] ?? null) === 'approved' ? now() : null,
            ], fn($v) => $v !== null));

            if (isset($validated['items'])) {
                $budget->items()->delete();
                $months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
                foreach ($validated['items'] as $item) {
                    $total = array_sum(array_map(fn($m) => (float) ($item[$m] ?? 0), $months));
                    BudgetItemModel::create(array_merge(
                        ['id' => Str::uuid()->toString(), 'budget_id' => $budget->id],
                        array_fill_keys($months, 0),
                        $item,
                        ['total' => $total]
                    ));
                }
            }
        });

        return $this->success($budget->fresh('items.account:id,code,name,name_ar'), 'Budget updated');
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $budget = BudgetModel::query()
            ->where('tenant_id', $this->getTenantId($request))
            ->where('status', 'draft')
            ->findOrFail($id);

        $budget->delete();

        return $this->success(null, 'Budget deleted');
    }

    public function approve(Request $request, string $id): JsonResponse
    {
        $budget = BudgetModel::query()
            ->where('tenant_id', $this->getTenantId($request))
            ->where('status', 'draft')
            ->findOrFail($id);

        $budget->update([
            'status'      => 'approved',
            'approved_by' => auth()->id(),
            'approved_at' => now(),
        ]);

        return $this->success($budget->fresh(), 'Budget approved');
    }

    /**
     * Budget vs Actual variance report.
     */
    public function variance(Request $request, string $id): JsonResponse
    {
        $tenantId = $this->getTenantId($request);

        $budget = BudgetModel::query()
            ->where('tenant_id', $tenantId)
            ->with(['items.account:id,code,name,name_ar,type'])
            ->findOrFail($id);

        // Sum actual journal entry movements per account in budget period
        $accountIds = $budget->items->pluck('account_id')->unique()->values();

        $actuals = JournalEntryLineModel::query()
            ->join('journal_entries', 'journal_entries.id', '=', 'journal_entry_lines.journal_entry_id')
            ->where('journal_entries.tenant_id', $tenantId)
            ->where('journal_entries.is_posted', 1)
            ->whereBetween('journal_entries.date', [
                $budget->period_start->format('Y-m-d'),
                $budget->period_end->format('Y-m-d'),
            ])
            ->whereIn('journal_entry_lines.account_id', $accountIds)
            ->selectRaw('journal_entry_lines.account_id, SUM(journal_entry_lines.debit) as total_debit, SUM(journal_entry_lines.credit) as total_credit')
            ->groupBy('journal_entry_lines.account_id')
            ->get()
            ->keyBy('account_id');

        $items = $budget->items->map(function ($item) use ($actuals) {
            $actual = $actuals->get($item->account_id);
            $actualDebit  = $actual ? (float) $actual->total_debit  : 0;
            $actualCredit = $actual ? (float) $actual->total_credit : 0;

            // For expense/asset accounts: net = debit - credit; for revenue/liability/equity: credit - debit
            $accountType  = $item->account->type ?? 'expense';
            $actualNet = in_array($accountType, ['expense', 'asset'])
                ? $actualDebit - $actualCredit
                : $actualCredit - $actualDebit;

            $budgeted  = (float) $item->total;
            $variance  = $budgeted - $actualNet;
            $pct       = $budgeted != 0 ? round(($actualNet / $budgeted) * 100, 1) : null;

            return [
                'account_id'   => $item->account_id,
                'account_code' => $item->account->code ?? '',
                'account_name' => $item->account->name ?? '',
                'account_name_ar' => $item->account->name_ar ?? '',
                'account_type' => $accountType,
                'budgeted'     => $budgeted,
                'actual'       => round($actualNet, 2),
                'variance'     => round($variance, 2),
                'variance_pct' => $pct,
                'monthly'      => [
                    'jan' => $item->jan, 'feb' => $item->feb, 'mar' => $item->mar,
                    'apr' => $item->apr, 'may' => $item->may, 'jun' => $item->jun,
                    'jul' => $item->jul, 'aug' => $item->aug, 'sep' => $item->sep,
                    'oct' => $item->oct, 'nov' => $item->nov, 'dec' => $item->dec,
                ],
            ];
        });

        $totalBudgeted = $items->sum('budgeted');
        $totalActual   = $items->sum('actual');

        return $this->success([
            'budget'    => $budget->only(['id','name','fiscal_year','period_start','period_end','status']),
            'items'     => $items->values(),
            'summary'   => [
                'total_budgeted' => round($totalBudgeted, 2),
                'total_actual'   => round($totalActual, 2),
                'total_variance' => round($totalBudgeted - $totalActual, 2),
            ],
        ]);
    }
}
