<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\HR;

use App\Infrastructure\Eloquent\Models\AttendanceModel;
use App\Infrastructure\Eloquent\Models\EmployeeModel;
use App\Infrastructure\Eloquent\Models\PayrollItemModel;
use App\Infrastructure\Eloquent\Models\PayrollModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PayrollItemController extends BaseTenantController
{
    public function index(Request $request): JsonResponse
    {
        $query = PayrollItemModel::where('tenant_id', $this->getTenantId($request))
            ->with(['employee:id,name,position', 'creator:id,name'])
            ->orderBy('created_at', 'desc');

        if ($request->filled('employee_id')) $query->where('employee_id', $request->employee_id);
        if ($request->filled('month')) $query->where('month', $request->month);
        if ($request->filled('year'))  $query->where('year', $request->year);
        if ($request->filled('type'))  $query->where('type', $request->type);
        if ($request->filled('status')) $query->where('status', $request->status);

        $items = $query->paginate((int) $request->query('limit', 20));
        return $this->paginated($items->toArray(), 'Items retrieved');
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_id' => 'required|uuid|exists:employees,id',
            'month'       => 'required|integer|min:1|max:12',
            'year'        => 'required|integer|min:2000',
            'type'        => 'required|string|in:deduction,bonus,advance,overtime,other_add,other_deduct',
            'reason'      => 'required|string|max:500',
            'amount'      => 'required|numeric|min:0.01',
            'notes'       => 'nullable|string|max:1000',
        ]);

        $employee = EmployeeModel::where('tenant_id', $this->getTenantId($request))->find($validated['employee_id']);
        if (!$employee) return $this->error('Employee not found', 404);

        $payroll = PayrollModel::where('employee_id', $validated['employee_id'])
            ->where('month', $validated['month'])
            ->where('year', $validated['year'])
            ->where('status', 'draft') 
            ->first();

        $item = new PayrollItemModel($validated);
        $item->tenant_id  = $this->getTenantId($request);
        $item->created_by = $request->user()?->id;
        $item->status     = 'approved';
        $item->payroll_id = $payroll?->id;
        $item->save();

        if ($payroll) {
            $this->recalculatePayroll($payroll);
        }

        return $this->success($item->load('employee'), 'Item added successfully', 201);
    }

    private function recalculatePayroll(PayrollModel $payroll): void
    {
        $items = PayrollItemModel::where('payroll_id', $payroll->id)
            ->where('status', 'approved')
            ->get();

        $totalDeductions = $items->filter->isDeduction()->sum('amount');
        $totalBonuses    = $items->filter->isAddition()->sum('amount');

        // add late attendance deductions from attendance records 
        // This recalculation should also fetch attendance if not using the job.
        // Actually GeneratePayrollJob stores initial late deductions.
        // If we strictly recalculate based on items, we might wipe out the late deduction.
        // Wait, the late deductions can be passed or we fetch it.
        $attendances = AttendanceModel::where('employee_id', $payroll->employee_id)
            ->whereMonth('date', $payroll->month)
            ->whereYear('date', $payroll->year)
            ->get();

        $lateDeductions = (float) $attendances->sum('penalty_amount');
        if ($lateDeductions == 0 && $attendances->sum('late_minutes') > 0) {
            $lateDeductions = $attendances->sum('late_minutes') * 0.5;
        }

        $totalDeductions += $lateDeductions;

        $deductionsBreakdown = [];
        if ($lateDeductions > 0) {
            $deductionsBreakdown[] = ['reason' => 'جزاءات التأخير', 'type' => 'خصم تأخير', 'amount' => $lateDeductions];
        }
        foreach ($items->filter->isDeduction() as $i) {
            $deductionsBreakdown[] = ['reason' => $i->reason, 'type' => $i->type_label, 'amount' => (float)$i->amount];
        }

        $payroll->update([
            'deductions'  => $totalDeductions,
            'bonuses'     => $totalBonuses,
            'net_salary'  => max(0, (float)$payroll->base_salary + $totalBonuses - $totalDeductions),

            'deductions_breakdown' => $deductionsBreakdown,

            'bonuses_breakdown' => $items->where('type', 'bonus')
                ->merge($items->where('type', 'overtime'))
                ->merge($items->where('type', 'other_add'))
                ->map(fn($i) => ['reason' => $i->reason, 'type' => $i->type_label, 'amount' => (float)$i->amount])
                ->values()->toArray(),

            'advances_breakdown' => $items->where('type', 'advance')
                ->map(fn($i) => ['reason' => $i->reason, 'amount' => (float)$i->amount])
                ->values()->toArray(),
        ]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $item = PayrollItemModel::where('tenant_id', $this->getTenantId($request))->find($id);
        if (!$item) return $this->error('Item not found', 404);

        if ($item->payroll?->status === 'paid') {
            return $this->error('لا يمكن حذف بند من راتب مدفوع', 422);
        }

        $payroll = $item->payroll;
        $item->delete();

        if ($payroll && $payroll->status === 'draft') {
            $this->recalculatePayroll($payroll);
        }

        return $this->success(null, 'Item deleted successfully');
    }

    public function getPayslip(Request $request, string $payrollId): JsonResponse
    {
        $payroll = PayrollModel::where('tenant_id', $this->getTenantId($request))
            ->with([
                'employee:id,name,position,phone,base_salary,shift_start,shift_end',
                'items',
            ])
            ->find($payrollId);

        if (!$payroll) return $this->error('Payroll not found', 404);

        $attendanceSummary = AttendanceModel::where('employee_id', $payroll->employee_id)
            ->whereMonth('date', $payroll->month)
            ->whereYear('date', $payroll->year)
            ->selectRaw("
                COUNT(*) as working_days,
                SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
                SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_days,
                SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_days,
                SUM(late_minutes) as total_late_minutes,
                SUM(COALESCE(penalty_amount, 0)) as total_late_penalty
            ")
            ->first();

        $companyName = DB::connection('tenant')->table('tenant_settings')
            ->where('tenant_id', $this->getTenantId($request))
            ->where('key', 'company_name')->value('value') ?? '';

        $items = $payroll->items;

        return $this->success([
            'payroll'            => $payroll,
            'employee'           => $payroll->employee,
            'company_name'       => $companyName,
            'attendance_summary' => $attendanceSummary,
            'items' => [
                'deductions'   => $items->filter->isDeduction()->values(),
                'bonuses'      => $items->filter->isAddition()->values(),
                'advances'     => $items->where('type', 'advance')->values(),
            ],
            'totals' => [
                'base_salary'       => (float) $payroll->base_salary,
                'total_bonuses'     => (float) $payroll->bonuses,
                'total_deductions'  => (float) $payroll->deductions,
                'net_salary'        => (float) $payroll->net_salary,
            ],
        ]);
    }

    public function recordSignature(Request $request, string $payrollId): JsonResponse
    {
        $validated = $request->validate([
            'signature_url' => 'nullable|string',
            'notes'         => 'nullable|string|max:500',
        ]);

        $payroll = PayrollModel::where('tenant_id', $this->getTenantId($request))->find($payrollId);
        if (!$payroll) return $this->error('Payroll not found', 404);

        $payroll->update([
            'employee_signature_url' => $validated['signature_url'] ?? null,
            'signed_at'              => now(),
            'payslip_notes'          => $validated['notes'] ?? null,
        ]);

        return $this->success($payroll, 'Signature recorded successfully');
    }
}
