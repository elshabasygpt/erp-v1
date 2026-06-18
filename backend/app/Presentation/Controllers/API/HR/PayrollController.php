<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\HR;

use App\Infrastructure\Eloquent\Models\ExpenseCategoryModel;
use App\Infrastructure\Eloquent\Models\ExpenseModel;
use App\Infrastructure\Eloquent\Models\PayrollModel;
use App\Jobs\GeneratePayrollJob;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PayrollController extends BaseTenantController
{
    public function index(Request $request): JsonResponse
    {
        $limit = $request->query('limit', '15');
        $month = $request->query('month', date('n'));
        $year = $request->query('year', date('Y'));

        $tenantId = $this->getTenantId($request);
        $query = PayrollModel::query()->where('tenant_id', $this->getTenantId($request))->with('employee')
            ->whereHas('employee', fn ($q) => $q->where('tenant_id', $tenantId))
            ->where('month', $month)
            ->where('year', $year)
            ->orderBy('created_at', 'desc');

        $payrolls = $query->paginate((int) $limit);

        return $this->paginated($payrolls->toArray(), 'Payrolls retrieved successfully');
    }

    public function generate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'month' => 'required|integer|min:1|max:12',
            'year' => 'required|integer|min:2000',
        ]);

        $tenantId = $this->getTenantId($request);

        GeneratePayrollJob::dispatch(
            tenantId: (string) $tenantId,
            month: (int) $validated['month'],
            year: (int) $validated['year'],
        );

        return response()->json([
            'success' => true,
            'message' => 'Payroll generation queued successfully. Results will be available shortly.',
            'data' => null,
        ], 202);
    }

    public function markAsPaid(Request $request, string $id): JsonResponse
    {
        $payroll = PayrollModel::whereHas('employee', fn ($q) => $q->where('tenant_id', $this->getTenantId($request))
        )->with('employee')->findOrFail($id);

        if ($payroll->status === 'paid') {
            return $this->error('Payroll is already paid', 400);
        }

        try {
            DB::connection('tenant')->beginTransaction();

            // 1. Create/Find an Expense Category for Salaries
            $category = ExpenseCategoryModel::query()->firstOrCreate(
                ['name' => 'Salaries & Wages'],
                ['id' => Str::uuid()->toString(), 'description' => 'Employee Salaries']
            );

            // 2. Create the Expense
            $expenseDate = now()->toDateString();
            $expense = ExpenseModel::query()->create([
                'tenant_id' => $this->getTenantId($request),
                'id' => Str::uuid()->toString(),
                'category_id' => $category->id,
                'amount' => $payroll->net_salary,
                'expense_date' => $expenseDate,
                'reference_number' => 'PR-'.$payroll->year.'-'.str_pad((string) $payroll->month, 2, '0', STR_PAD_LEFT).'-'.substr($payroll->employee_id, 0, 4),
                'description' => 'Salary payment for '.$payroll->employee->name.' ('.$payroll->month.'/'.$payroll->year.')',
                'notes' => 'Generated automatically from HR Payroll',
            ]);

            // 3. Update Payroll Status
            $payroll->update([
                'status' => 'paid',
                'expense_id' => $expense->id,
            ]);

            DB::connection('tenant')->commit();

            return $this->success($payroll, 'Payroll marked as paid and expense recorded successfully');
        } catch (\Exception $e) {
            DB::connection('tenant')->rollBack();

            return $this->error('Failed to process payment: '.$e->getMessage(), 500);
        }
    }
}
