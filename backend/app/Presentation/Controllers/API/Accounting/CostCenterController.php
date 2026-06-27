<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Accounting;

use App\Infrastructure\Eloquent\Models\Accounting\CostCenterModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CostCenterController extends BaseTenantController
{
    public function index(Request $request): JsonResponse
    {
        $costCenters = CostCenterModel::query()
            ->where('tenant_id', $this->getTenantId($request))
            ->with('children')
            ->whereNull('parent_id')
            ->when($request->has('active'), fn($q) => $q->where('is_active', true))
            ->orderBy('code')
            ->get();

        return $this->success($costCenters);
    }

    public function flat(Request $request): JsonResponse
    {
        $costCenters = CostCenterModel::query()
            ->where('tenant_id', $this->getTenantId($request))
            ->when($request->has('active'), fn($q) => $q->where('is_active', true))
            ->orderBy('code')
            ->get();

        return $this->success($costCenters);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code'      => 'required|string|max:50',
            'name'      => 'required|string|max:255',
            'type'      => 'nullable|in:cost,profit',
            'parent_id' => 'nullable|uuid|exists:tenant.cost_centers,id',
            'is_active' => 'nullable|boolean',
        ]);

        $tenantId = $this->getTenantId($request);

        $duplicate = CostCenterModel::query()
            ->where('tenant_id', $tenantId)
            ->where('code', $validated['code'])
            ->exists();

        if ($duplicate) {
            return $this->error('Cost center code already exists.', 422);
        }

        $validated['tenant_id'] = $tenantId;
        $validated['is_active'] = $validated['is_active'] ?? true;
        $validated['type']      = $validated['type'] ?? 'cost';

        $costCenter = CostCenterModel::query()->create($validated);

        return $this->success($costCenter, 'Cost center created successfully', 201);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $costCenter = CostCenterModel::query()
            ->where('tenant_id', $this->getTenantId($request))
            ->with(['parent', 'children'])
            ->findOrFail($id);

        return $this->success($costCenter);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $costCenter = CostCenterModel::query()
            ->where('tenant_id', $this->getTenantId($request))
            ->findOrFail($id);

        $validated = $request->validate([
            'code'      => 'sometimes|required|string|max:50',
            'name'      => 'sometimes|required|string|max:255',
            'type'      => 'nullable|in:cost,profit',
            'parent_id' => 'nullable|uuid|exists:tenant.cost_centers,id',
            'is_active' => 'nullable|boolean',
        ]);

        if (isset($validated['code']) && $validated['code'] !== $costCenter->code) {
            $duplicate = CostCenterModel::query()
                ->where('tenant_id', $this->getTenantId($request))
                ->where('code', $validated['code'])
                ->where('id', '!=', $id)
                ->exists();

            if ($duplicate) {
                return $this->error('Cost center code already exists.', 422);
            }
        }

        // Prevent setting parent to self or own child
        if (!empty($validated['parent_id']) && $validated['parent_id'] === $id) {
            return $this->error('A cost center cannot be its own parent.', 422);
        }

        $costCenter->update($validated);

        return $this->success($costCenter->fresh(['parent', 'children']), 'Cost center updated successfully');
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $costCenter = CostCenterModel::query()
            ->where('tenant_id', $this->getTenantId($request))
            ->findOrFail($id);

        if ($costCenter->children()->count() > 0) {
            return $this->error('Cannot delete a cost center that has sub-centers.', 422);
        }

        // Check if used in journal entry lines
        $usedInJournal = DB::connection('tenant')
            ->table('journal_entry_lines')
            ->where('cost_center_id', $id)
            ->exists();

        if ($usedInJournal) {
            return $this->error('Cannot delete a cost center that has journal entry lines.', 422);
        }

        $costCenter->delete();

        return $this->success(null, 'Cost center deleted successfully');
    }

    /** P&L report grouped by cost center for a date range */
    public function report(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'from'           => 'required|date',
            'to'             => 'required|date|after_or_equal:from',
            'cost_center_id' => 'nullable|uuid|exists:tenant.cost_centers,id',
        ]);

        $tenantId = (string) $this->getTenantId($request);
        $from = $validated['from'];
        $to   = $validated['to'];

        $query = DB::connection('tenant')->table('journal_entry_lines')
            ->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
            ->join('accounts', 'journal_entry_lines.account_id', '=', 'accounts.id')
            ->leftJoin('cost_centers', 'journal_entry_lines.cost_center_id', '=', 'cost_centers.id')
            ->where('journal_entries.tenant_id', $tenantId)
            ->where('journal_entries.is_posted', 1)
            ->whereBetween('journal_entries.date', [$from, $to])
            ->whereIn('accounts.type', ['revenue', 'expense'])
            ->select(
                'cost_centers.id as cost_center_id',
                'cost_centers.code as cost_center_code',
                'cost_centers.name as cost_center_name',
                'accounts.type as account_type',
                DB::raw('COALESCE(SUM(journal_entry_lines.credit) - SUM(journal_entry_lines.debit), 0) as revenue'),
                DB::raw('COALESCE(SUM(journal_entry_lines.debit) - SUM(journal_entry_lines.credit), 0) as expense')
            )
            ->groupBy('cost_centers.id', 'cost_centers.code', 'cost_centers.name', 'accounts.type')
            ->orderBy('cost_centers.code');

        if (!empty($validated['cost_center_id'])) {
            $query->where('journal_entry_lines.cost_center_id', $validated['cost_center_id']);
        }

        $rows = $query->get();

        // Aggregate by cost center
        $byCenter = [];
        foreach ($rows as $row) {
            $key = $row->cost_center_id ?? '__unassigned__';
            if (!isset($byCenter[$key])) {
                $byCenter[$key] = [
                    'cost_center_id'   => $row->cost_center_id,
                    'cost_center_code' => $row->cost_center_code ?? 'N/A',
                    'cost_center_name' => $row->cost_center_name ?? 'Unassigned',
                    'total_revenue'    => 0.0,
                    'total_expense'    => 0.0,
                    'net_income'       => 0.0,
                ];
            }
            if ($row->account_type === 'revenue') {
                $byCenter[$key]['total_revenue'] += (float) $row->revenue;
            } else {
                $byCenter[$key]['total_expense'] += (float) $row->expense;
            }
        }

        foreach ($byCenter as &$center) {
            $center['net_income']    = round($center['total_revenue'] - $center['total_expense'], 2);
            $center['total_revenue'] = round($center['total_revenue'], 2);
            $center['total_expense'] = round($center['total_expense'], 2);
        }

        return $this->success([
            'period'       => ['from' => $from, 'to' => $to],
            'cost_centers' => array_values($byCenter),
        ]);
    }
}
