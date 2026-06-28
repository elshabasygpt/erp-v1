<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\HR;

use App\Infrastructure\Eloquent\Models\AttendanceModel;
use App\Infrastructure\Eloquent\Models\EmployeeModel;
use App\Presentation\Controllers\API\BaseTenantController;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use App\Application\HR\Services\PenaltyCalculatorService;
use App\Infrastructure\Eloquent\Models\LatePenaltyRuleModel;
use App\Jobs\SendLateAttendanceNotificationJob;
use App\Mail\LateAttendanceNotification;
use Illuminate\Support\Facades\Mail;

class AttendanceController extends BaseTenantController
{
    public function index(Request $request): JsonResponse
    {
        $limit = $request->query('limit', '30');
        $date = $request->query('date', now()->toDateString());

        $query = AttendanceModel::query()->where('tenant_id', $this->getTenantId($request))->with(['employee:id,name,position'])
            ->where('tenant_id', $this->getTenantId($request))
            ->whereDate('date', $date)
            ->orderBy('created_at', 'desc');

        $attendances = $query->paginate((int) $limit);

        return $this->paginated($attendances->toArray(), 'Attendance records retrieved successfully');
    }

    public function checkIn(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_id' => 'required|uuid|exists:employees,id',
            'time' => 'nullable|date_format:H:i:s,H:i',
            'date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $employee = EmployeeModel::query()->where('tenant_id', $this->getTenantId($request))->findOrFail($validated['employee_id']);
        $date = $validated['date'] ?? now()->toDateString();
        $timeStr = $validated['time'] ?? now()->toTimeString();

        // Fix H:i format
        if (strlen($timeStr) === 5) {
            $timeStr .= ':00';
        }

        $checkInTime = Carbon::createFromFormat('H:i:s', $timeStr);
        $lateMinutes = 0;

        if ($employee->shift_start) {
            $shiftStart = Carbon::createFromFormat('H:i:s', $employee->shift_start);
            if ($checkInTime->greaterThan($shiftStart)) {
                $lateMinutes = $checkInTime->diffInMinutes($shiftStart);
            }
        }

        // 1. احسب الجزاء بالخدمة الجديدة
        $calculator = new PenaltyCalculatorService();
        $penaltyResult = $calculator->calculate(
            rawLateMinutes: (int) $lateMinutes,
            baseSalary: (float) $employee->base_salary,
            tenantId: (string) $this->getTenantId($request)
        );

        // 2. حدّث الـ attendance record
        $attendance = AttendanceModel::query()->updateOrCreate(
            ['employee_id' => $employee->id, 'date' => $date],
            [
                'id' => Str::uuid()->toString(),
                'check_in'               => $timeStr,
                'late_minutes'           => $lateMinutes,
                'grace_minutes_applied'  => $penaltyResult['grace_minutes_applied'],
                'penalty_amount'         => $penaltyResult['penalty_amount'],
                'penalty_rule_label'     => $penaltyResult['rule']?->label_ar ?? $penaltyResult['rule']?->label,
                'status'                 => $lateMinutes > 0 ? 'late' : 'present',
                'notification_sent'      => false,
                'notes'                  => $validated['notes'] ?? null,
            ]
        );

        // 3. لو متأخر → أرسل إشعار للمسؤول (كـ Job في الخلفية)
        if ($lateMinutes > 0) {
            SendLateAttendanceNotificationJob::dispatch(
                (string) $this->getTenantId($request),
                (string) $attendance->id,
                (string) $employee->id,
                [
                    'effective_late_minutes' => $penaltyResult['effective_late_minutes'] ?? 0,
                    'penalty_amount'         => $penaltyResult['penalty_amount'] ?? 0,
                    'penalty_rule_label'     => $penaltyResult['rule']?->label_ar
                                                  ?? $penaltyResult['rule']?->label
                                                  ?? 'غير محدد',
                ],
            );
        }

        // 4. رجّع نفس الـ response الموجود مع إضافة بيانات الجزاء
        $responseData = $attendance->load('employee')->toArray();
        $responseData['penalty_info'] = [
            'amount'         => $penaltyResult['penalty_amount'],
            'rule'           => $penaltyResult['rule']?->label_ar ?? $penaltyResult['rule']?->label,
            'effective_late' => $penaltyResult['effective_late_minutes'],
        ];

        return $this->success($responseData, 'Checked in successfully');
    }

    public function checkOut(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_id' => 'required|uuid|exists:employees,id',
            'time' => 'nullable|date_format:H:i:s,H:i',
            'date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $date = $validated['date'] ?? now()->toDateString();
        $timeStr = $validated['time'] ?? now()->toTimeString();

        if (strlen($timeStr) === 5) {
            $timeStr .= ':00';
        }

        $attendance = AttendanceModel::query()->where('tenant_id', $this->getTenantId($request))->where('employee_id', $validated['employee_id'])
            ->whereDate('date', $date)
            ->first();

        if (! $attendance) {
            // Create record if didn't check in
            $attendance = AttendanceModel::query()->create([
                'tenant_id' => $this->getTenantId($request),
                'id' => Str::uuid()->toString(),
                'employee_id' => $validated['employee_id'],
                'date' => $date,
                'status' => 'present',
            ]);
        }

        $notes = $attendance->notes;
        if (! empty($validated['notes'])) {
            $notes = $notes ? $notes.' | '.$validated['notes'] : $validated['notes'];
        }

        $attendance->update([
            'check_out' => $timeStr,
            'notes' => $notes,
        ]);

        return $this->success($attendance->load('employee'), 'Checked out successfully');
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $attendance = AttendanceModel::query()->where('tenant_id', $this->getTenantId($request))->find($id);

        if (! $attendance) {
            return $this->error('Attendance record not found', 404);
        }

        $validated = $request->validate([
            'status' => 'required|string|in:present,absent,late,on_leave',
            'notes' => 'nullable|string',
        ]);

        $attendance->update($validated);

        return $this->success($attendance->load('employee'), 'Attendance status updated successfully');
    }
}
