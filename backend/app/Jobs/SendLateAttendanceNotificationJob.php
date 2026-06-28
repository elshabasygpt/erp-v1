<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Infrastructure\Eloquent\Models\AttendanceModel;
use App\Infrastructure\Eloquent\Models\EmployeeModel;
use App\Jobs\Concerns\RunsInTenantContext;
use App\Mail\LateAttendanceNotification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendLateAttendanceNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, RunsInTenantContext, SerializesModels;

    public int $tries   = 3;
    public int $backoff = 30;

    /**
     * Carries only scalar identifiers + pre-flattened penalty data. We must NOT
     * pass Eloquent models here: SerializesModels would re-fetch them on the
     * `tenant` connection when the job is unserialized in a fresh worker —
     * i.e. against the WRONG (central) database, before handle() can switch.
     *
     * @param  array{effective_late_minutes:int|float, penalty_amount:int|float, penalty_rule_label:string}  $penaltyData
     */
    public function __construct(
        public readonly string $tenantId,
        public readonly string $attendanceId,
        public readonly string $employeeId,
        public readonly array  $penaltyData,
    ) {}

    public function handle(): void
    {
        $tenant = $this->bootTenantContext($this->tenantId);
        if (! $tenant) {
            return;
        }

        try {
            $this->process();
        } finally {
            $this->shutdownTenantContext();
        }
    }

    private function process(): void
    {
        $attendance = AttendanceModel::query()->find($this->attendanceId);
        $employee   = EmployeeModel::query()->find($this->employeeId);

        if (! $attendance || ! $employee) {
            Log::warning('LateAttendanceNotification: attendance or employee not found', [
                'tenant_id'     => $this->tenantId,
                'attendance_id' => $this->attendanceId,
                'employee_id'   => $this->employeeId,
            ]);

            return;
        }

        try {
            // 1. جلب إيميل المسؤول من الـ tenant settings أو أول owner
            $managerEmail = $this->getManagerEmail();

            if (! $managerEmail) {
                Log::warning('LateAttendanceNotification: No manager email found', [
                    'tenant_id'   => $this->tenantId,
                    'employee_id' => $employee->id,
                ]);

                return;
            }

            // 2. جلب اسم الشركة
            $tenantName = $this->getTenantName();

            // 3. إرسال الإيميل
            Mail::to($managerEmail)->send(new LateAttendanceNotification(
                employeeName:         $employee->name,
                employeePosition:     $employee->position ?? '',
                checkInTime:          $attendance->check_in,
                shiftStartTime:       $employee->shift_start ?? '--:--',
                lateMinutes:          $attendance->late_minutes,
                effectiveLateMinutes: $this->penaltyData['effective_late_minutes'] ?? 0,
                penaltyAmount:        $this->penaltyData['penalty_amount'] ?? 0,
                penaltyRuleLabel:     $this->penaltyData['penalty_rule_label'] ?? 'غير محدد',
                attendanceDate:       $attendance->date->format('Y-m-d'),
                tenantName:           $tenantName,
            ));

            // 4. حدّث الـ attendance بأن الإشعار أُرسل
            $attendance->update([
                'notification_sent'    => true,
                'notification_sent_at' => now(),
            ]);

            Log::info('LateAttendanceNotification sent', [
                'to'           => $managerEmail,
                'employee'     => $employee->name,
                'late_minutes' => $attendance->late_minutes,
            ]);
        } catch (\Exception $e) {
            Log::error('LateAttendanceNotification failed', [
                'error'       => $e->getMessage(),
                'employee_id' => $employee->id,
            ]);
            throw $e; // يسمح بإعادة المحاولة
        }
    }

    private function getManagerEmail(): ?string
    {
        // الأولوية: 1) إعداد HR manager في الـ settings (DB المستأجر)
        $setting = DB::connection('tenant')
            ->table('tenant_settings')
            ->where('key', 'hr_manager_email')
            ->value('value');

        if ($setting) {
            return $setting;
        }

        // 2) fallback: أول owner في tenant_users — وهو جدول مركزي، فنستعلمه
        // على الاتصال المركزي صراحةً (لأن الاتصال الافتراضي الآن = DB المستأجر).
        return DB::connection(config('database.default'))
            ->table('tenant_users')
            ->where('tenant_id', $this->tenantId)
            ->where('is_owner', true)
            ->value('email');
    }

    private function getTenantName(): string
    {
        return DB::connection('tenant')
            ->table('tenant_settings')
            ->where('key', 'company_name')
            ->value('value') ?? 'الشركة';
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('SendLateAttendanceNotificationJob permanently failed', [
            'tenant_id'     => $this->tenantId,
            'attendance_id' => $this->attendanceId,
            'employee_id'   => $this->employeeId,
            'error'         => $exception->getMessage(),
        ]);
    }
}
