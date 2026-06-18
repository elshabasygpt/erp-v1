<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\HR;

use App\Infrastructure\Eloquent\Models\EmployeeLoanModel;
use App\Infrastructure\Eloquent\Models\EmployeeLoanInstallmentModel;
use App\Infrastructure\Eloquent\Models\EmployeeModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EmployeeLoanController extends BaseTenantController
{
    public function index(Request $request): JsonResponse
    {
        $query = EmployeeLoanModel::where('tenant_id', $this->getTenantId($request))
            ->with(['employee:id,name,position,base_salary'])
            ->withCount(['installments', 'pendingInstallments as pending_count'])
            ->orderBy('created_at', 'desc');

        if ($request->filled('employee_id')) $query->where('employee_id', $request->employee_id);
        if ($request->filled('status'))      $query->where('status', $request->status);

        $loans = $query->paginate((int) $request->query('limit', 15));

        $loans->getCollection()->transform(function ($loan) {
            $loan->repayment_percentage = $loan->repayment_percentage;
            return $loan;
        });

        return $this->paginated($loans->toArray(), 'Loans retrieved');
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_id'        => 'required|uuid|exists:employees,id',
            'total_amount'       => 'required|numeric|min:1',
            'installments_count' => 'required|integer|min:1|max:60',
            'start_month'        => 'required|integer|min:1|max:12',
            'start_year'         => 'required|integer|min:2000',
            'reason'             => 'nullable|string|max:500',
            'notes'              => 'nullable|string',
        ]);

        $tenantId = $this->getTenantId($request);

        $employee = EmployeeModel::where('tenant_id', $tenantId)->find($validated['employee_id']);
        if (!$employee) return $this->error('Employee not found', 404);

        // تحقق: القسط لا يتجاوز 50% من الراتب الأساسي
        $installmentAmount = round($validated['total_amount'] / $validated['installments_count'], 2);
        $maxInstallment    = (float) $employee->base_salary * 0.5;

        if ($installmentAmount > $maxInstallment) {
            return $this->error(
                "القسط الشهري ({$installmentAmount}) يتجاوز 50% من الراتب ({$maxInstallment}). زِد عدد الأقساط.",
                422
            );
        }

        $loan = DB::connection('tenant')->transaction(function () use ($validated, $employee, $installmentAmount, $tenantId, $request) {
            $startDate = \Carbon\Carbon::create($validated['start_year'], $validated['start_month'], 1);
            $endDate   = $startDate->copy()->addMonths($validated['installments_count'] - 1);

            // توليد رقم السلفة
            $lastNum    = EmployeeLoanModel::where('tenant_id', $tenantId)
                ->max(DB::connection('tenant')->raw("CAST(SUBSTRING(loan_number, 5) AS INTEGER)")) ?? 0;
            $loanNumber = 'SLF-' . str_pad((string)($lastNum + 1), 6, '0', STR_PAD_LEFT);

            $loan = new EmployeeLoanModel([
                'employee_id'        => $employee->id,
                'loan_number'        => $loanNumber,
                'total_amount'       => $validated['total_amount'],
                'remaining_amount'   => $validated['total_amount'],
                'installments_count' => $validated['installments_count'],
                'installment_amount' => $installmentAmount,
                'start_date'         => $startDate->toDateString(),
                'end_date'           => $endDate->endOfMonth()->toDateString(),
                'status'             => 'active',
                'reason'             => $validated['reason'] ?? null,
                'notes'              => $validated['notes'] ?? null,
                'approved_by'        => $request->user()->id,
                'approved_at'        => now(),
                'created_by'         => $request->user()->id,
            ]);
            $loan->tenant_id = $tenantId;
            $loan->save();

            // إنشاء جدول الأقساط تلقائياً
            $installments = [];
            $currentDate  = $startDate->copy();

            for ($i = 1; $i <= $validated['installments_count']; $i++) {
                // القسط الأخير يأخذ الفارق لتصحيح التقريب
                $amount = ($i === $validated['installments_count'])
                    ? round($validated['total_amount'] - ($installmentAmount * ($validated['installments_count'] - 1)), 2)
                    : $installmentAmount;

                $installments[] = [
                    'id'                 => \Illuminate\Support\Str::uuid()->toString(),
                    'tenant_id'          => $tenantId,
                    'loan_id'            => $loan->id,
                    'installment_number' => $i,
                    'month'              => $currentDate->month,
                    'year'               => $currentDate->year,
                    'amount'             => $amount,
                    'status'             => 'pending',
                    'due_date'           => $currentDate->endOfMonth()->toDateString(),
                    'created_at'         => now(),
                    'updated_at'         => now(),
                ];
                $currentDate->addMonth();
            }

            DB::connection('tenant')->table('employee_loan_installments')->insert($installments);

            return $loan;
        });

        $loan->load(['employee:id,name,position', 'installments']);
        $loan->repayment_percentage = 0;

        return $this->success($loan, 'Loan created successfully', 201);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $loan = EmployeeLoanModel::where('tenant_id', $this->getTenantId($request))
            ->with([
                'employee:id,name,position,base_salary',
                'installments.payroll:id,month,year,status',
            ])
            ->find($id);

        if (!$loan) return $this->error('Loan not found', 404);

        $loan->repayment_percentage = $loan->repayment_percentage;
        return $this->success($loan);
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|string|in:active,paused,cancelled',
            'notes'  => 'nullable|string',
        ]);

        $loan = EmployeeLoanModel::where('tenant_id', $this->getTenantId($request))->find($id);
        if (!$loan) return $this->error('Loan not found', 404);

        if ($loan->status === 'completed') {
            return $this->error('لا يمكن تعديل سلفة مكتملة', 422);
        }

        $loan->update([
            'status' => $validated['status'],
            'notes'  => $validated['notes'] ?? $loan->notes,
        ]);

        return $this->success($loan, 'Loan status updated');
    }

    public function skipInstallment(Request $request, string $installmentId): JsonResponse
    {
        $installment = EmployeeLoanInstallmentModel::where('tenant_id', $this->getTenantId($request))
            ->find($installmentId);

        if (!$installment) return $this->error('Installment not found', 404);
        if ($installment->status === 'deducted') return $this->error('القسط خُصم بالفعل', 422);

        $installment->update([
            'status' => 'skipped',
            'notes'  => $request->input('notes', 'تم التأجيل يدوياً'),
        ]);

        return $this->success($installment, 'Installment skipped');
    }

    public function getSummary(Request $request): JsonResponse
    {
        $tenantId = $this->getTenantId($request);

        $loans = EmployeeLoanModel::where('tenant_id', $tenantId)
            ->with('employee:id,name')
            ->get();

        return $this->success([
            'total_loans'          => $loans->count(),
            'active_loans'         => $loans->where('status', 'active')->count(),
            'total_given'          => round($loans->sum('total_amount'), 2),
            'total_remaining'      => round($loans->sum('remaining_amount'), 2),
            'total_collected'      => round($loans->sum('total_amount') - $loans->sum('remaining_amount'), 2),
            'employees_with_loans' => $loans->where('status', 'active')->pluck('employee_id')->unique()->count(),
            'this_month_deductions' => round(
                EmployeeLoanInstallmentModel::where('tenant_id', $tenantId)
                    ->where('month', now()->month)
                    ->where('year', now()->year)
                    ->where('status', 'deducted')
                    ->sum('amount'), 2
            ),
        ]);
    }
}
