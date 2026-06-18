<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\HR;

use App\Infrastructure\Eloquent\Models\AttendanceModel;
use App\Infrastructure\Eloquent\Models\LatePenaltyRuleModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class LateAttendancePenaltyController extends BaseTenantController
{
    public function getRules(Request $request): JsonResponse
    {
        $rules = LatePenaltyRuleModel::where('tenant_id', $this->getTenantId($request))
            ->orderBy('sort_order')
            ->orderBy('late_from_minutes')
            ->get();
            
        return $this->success($rules);
    }

    public function storeRule(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'late_from_minutes' => 'required|integer|min:1',
            'late_to_minutes'   => 'required|integer|min:0',
            'deduction_type'    => 'required|string|in:fixed,per_minute,percentage_of_daily',
            'deduction_value'   => 'required|numeric|min:0',
            'grace_minutes'     => 'nullable|integer|min:0|max:120',
            'label'             => 'nullable|string|max:100',
            'label_ar'          => 'nullable|string|max:100',
            'sort_order'        => 'nullable|integer|min:0',
        ]);

        $overlap = LatePenaltyRuleModel::where('tenant_id', $this->getTenantId($request))
            ->where('is_active', true)
            ->where(function ($q) use ($validated) {
                $q->whereBetween('late_from_minutes', [$validated['late_from_minutes'], $validated['late_to_minutes'] ?: 99999])
                  ->orWhereBetween('late_to_minutes', [$validated['late_from_minutes'], $validated['late_to_minutes'] ?: 99999]);
            })
            ->exists();

        if ($overlap) {
            return $this->error('هذا النطاق يتداخل مع قاعدة موجودة. يرجى تعديل النطاقات.', 422);
        }

        $validated['id'] = Str::uuid()->toString();
        $validated['tenant_id'] = $this->getTenantId($request);
        $validated['created_by'] = $request->user()->id ?? null;

        $rule = LatePenaltyRuleModel::create($validated);
        
        Cache::forget("penalty_rules_{$this->getTenantId($request)}");

        return $this->success($rule, 'تم إنشاء القاعدة بنجاح');
    }

    public function updateRule(Request $request, string $id): JsonResponse
    {
        $rule = LatePenaltyRuleModel::where('tenant_id', $this->getTenantId($request))->findOrFail($id);

        $validated = $request->validate([
            'late_from_minutes' => 'sometimes|integer|min:1',
            'late_to_minutes'   => 'sometimes|integer|min:0',
            'deduction_type'    => 'sometimes|string|in:fixed,per_minute,percentage_of_daily',
            'deduction_value'   => 'sometimes|numeric|min:0',
            'grace_minutes'     => 'nullable|integer|min:0|max:120',
            'label'             => 'nullable|string|max:100',
            'label_ar'          => 'nullable|string|max:100',
            'sort_order'        => 'nullable|integer|min:0',
        ]);

        $rule->update($validated);
        
        Cache::forget("penalty_rules_{$this->getTenantId($request)}");

        return $this->success($rule, 'تم تحديث القاعدة بنجاح');
    }

    public function destroyRule(Request $request, string $id): JsonResponse
    {
        $rule = LatePenaltyRuleModel::where('tenant_id', $this->getTenantId($request))->findOrFail($id);
        $rule->delete();
        
        Cache::forget("penalty_rules_{$this->getTenantId($request)}");

        return $this->success(null, 'تم حذف القاعدة بنجاح');
    }

    public function getPenaltyReport(Request $request): JsonResponse
    {
        $month = (int) $request->query('month', now()->month);
        $year = (int) $request->query('year', now()->year);
        $employeeId = $request->query('employee_id');

        $query = AttendanceModel::where('tenant_id', $this->getTenantId($request))
            ->with('employee:id,name,position,base_salary')
            ->where('status', 'late')
            ->whereMonth('date', $month)
            ->whereYear('date', $year);

        if ($employeeId) {
            $query->where('employee_id', $employeeId);
        }

        $records = $query->orderBy('date', 'desc')->get();

        $byEmployee = $records->groupBy('employee_id')->map(function ($employeeRecords) {
            $emp = $employeeRecords->first()->employee;
            return [
                'employee_id'         => $emp->id,
                'employee_name'       => $emp->name,
                'position'            => $emp->position,
                'late_days_count'     => $employeeRecords->count(),
                'total_late_minutes'  => $employeeRecords->sum('late_minutes'),
                'total_penalty'       => round($employeeRecords->sum('penalty_amount'), 2),
                'records'             => $employeeRecords->map(fn($r) => [
                    'date'             => $r->date->format('Y-m-d'),
                    'check_in'         => $r->check_in,
                    'late_minutes'     => $r->late_minutes,
                    'penalty_amount'   => $r->penalty_amount,
                    'rule_label'       => $r->penalty_rule_label,
                    'notification_sent'=> $r->notification_sent,
                ])->values(),
            ];
        })->values();

        return $this->success([
            'month'        => $month,
            'year'         => $year,
            'by_employee'  => $byEmployee,
            'totals'       => [
                'total_late_days'     => $records->count(),
                'total_late_minutes'  => $records->sum('late_minutes'),
                'total_penalties'     => round($records->sum('penalty_amount'), 2),
                'employees_affected'  => $byEmployee->count(),
            ],
        ]);
    }
}
