<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Infrastructure\Eloquent\Models\AttendanceModel;
use App\Infrastructure\Eloquent\Models\EmployeeModel;
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
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 3;
    public int $backoff = 30;

    public function __construct(
        public readonly AttendanceModel $attendance,
        public readonly EmployeeModel   $employee,
        public readonly string          $tenantId,
        public readonly array           $penaltyResult,
    ) {}

    public function handle(): void
    {
        try {
            // 1. جلب إيميل المسؤول من الـ tenant settings أو أول owner
            $managerEmail = $this->getManagerEmail();

            if (!$managerEmail) {
                Log::warning('LateAttendanceNotification: No manager email found', [
                    'tenant_id'   => $this->tenantId,
                    'employee_id' => $this->employee->id,
                ]);
                return;
            }

            // 2. جلب اسم الشركة
            $tenantName = $this->getTenantName();

            // 3. إرسال الإيميل
            Mail::to($managerEmail)->send(new LateAttendanceNotification(
                employeeName:         $this->employee->name,
                employeePosition:     $this->employee->position ?? '',
                checkInTime:          $this->attendance->check_in,
                shiftStartTime:       $this->employee->shift_start ?? '--:--',
                lateMinutes:          $this->attendance->late_minutes,
                effectiveLateMinutes: $this->penaltyResult['effective_late_minutes'],
                penaltyAmount:        $this->penaltyResult['penalty_amount'],
                penaltyRuleLabel:     $this->penaltyResult['rule']?->label_ar
                                        ?? $this->penaltyResult['rule']?->label
                                        ?? 'غير محدد',
                attendanceDate:       $this->attendance->date->format('Y-m-d'),
                tenantName:           $tenantName,
            ));

            // 4. حدّث الـ attendance بأن الإشعار أُرسل
            $this->attendance->update([
                'notification_sent'    => true,
                'notification_sent_at' => now(),
            ]);

            Log::info('LateAttendanceNotification sent', [
                'to'          => $managerEmail,
                'employee'    => $this->employee->name,
                'late_minutes'=> $this->attendance->late_minutes,
            ]);

        } catch (\Exception $e) {
            Log::error('LateAttendanceNotification failed', [
                'error'       => $e->getMessage(),
                'employee_id' => $this->employee->id,
            ]);
            throw $e; // يسمح بإعادة المحاولة
        }
    }

    private function getManagerEmail(): ?string
    {
        // الأولوية: 1) إعداد HR manager في الـ settings  2) أول owner في tenant_users
        $setting = DB::connection('tenant')
            ->table('tenant_settings')
            ->where('key', 'hr_manager_email')
            ->value('value');

        if ($setting) return $setting;

        // fallback: أول user هو owner
        return DB::table('tenant_users')
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
}
