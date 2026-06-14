<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\HR;

use App\Presentation\Controllers\API\BaseController;
use App\Infrastructure\Eloquent\Models\AttendanceModel;
use App\Infrastructure\Eloquent\Models\EmployeeModel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Carbon\Carbon;

class AttendanceController extends BaseController
{
    public function index(Request $request): JsonResponse
    {
        $limit = $request->query('limit', '30');
        $date = $request->query('date', now()->toDateString());
        
        $query = AttendanceModel::with('employee')
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
            'notes' => 'nullable|string'
        ]);

        $employee = EmployeeModel::findOrFail($validated['employee_id']);
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

        $attendance = AttendanceModel::updateOrCreate(
            ['employee_id' => $employee->id, 'date' => $date],
            [
                'id' => Str::uuid()->toString(),
                'check_in' => $timeStr,
                'late_minutes' => $lateMinutes,
                'status' => $lateMinutes > 0 ? 'late' : 'present',
                'notes' => $validated['notes'] ?? null
            ]
        );

        return $this->success($attendance->load('employee'), 'Checked in successfully');
    }

    public function checkOut(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_id' => 'required|uuid|exists:employees,id',
            'time' => 'nullable|date_format:H:i:s,H:i',
            'date' => 'nullable|date',
            'notes' => 'nullable|string'
        ]);

        $date = $validated['date'] ?? now()->toDateString();
        $timeStr = $validated['time'] ?? now()->toTimeString();
        
        if (strlen($timeStr) === 5) {
            $timeStr .= ':00';
        }

        $attendance = AttendanceModel::where('employee_id', $validated['employee_id'])
            ->whereDate('date', $date)
            ->first();

        if (!$attendance) {
            // Create record if didn't check in
            $attendance = AttendanceModel::create([
                'id' => Str::uuid()->toString(),
                'employee_id' => $validated['employee_id'],
                'date' => $date,
                'status' => 'present',
            ]);
        }

        $notes = $attendance->notes;
        if (!empty($validated['notes'])) {
             $notes = $notes ? $notes . ' | ' . $validated['notes'] : $validated['notes'];
        }

        $attendance->update([
            'check_out' => $timeStr,
            'notes' => $notes
        ]);

        return $this->success($attendance->load('employee'), 'Checked out successfully');
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $attendance = AttendanceModel::find($id);

        if (!$attendance) {
            return $this->error('Attendance record not found', 404);
        }

        $validated = $request->validate([
            'status' => 'required|string|in:present,absent,late,on_leave',
            'notes' => 'nullable|string'
        ]);

        $attendance->update($validated);

        return $this->success($attendance->load('employee'), 'Attendance status updated successfully');
    }
}
