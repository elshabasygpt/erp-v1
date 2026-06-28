<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Infrastructure\Eloquent\Models\SupplierOrderingScheduleModel;
use App\Jobs\Concerns\RunsInTenantContext;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendOrderReminderJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, RunsInTenantContext, SerializesModels;

    public int $tries = 3;

    public function __construct(
        public readonly string $tenantId,
        public readonly string $scheduleId,
        public readonly int    $lowStockCount,
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
        $schedule = SupplierOrderingScheduleModel::with('supplier')
            ->find($this->scheduleId);

        if (!$schedule || !$schedule->reminder_enabled) {
            return;
        }

        $email = $schedule->responsible_email
            ?? DB::connection('tenant')->table('tenant_settings')
                  ->where('key', 'hr_manager_email')
                  ->value('value');

        if (!$email) {
            Log::warning("SendOrderReminderJob: No email for schedule {$this->scheduleId}");
            return;
        }

        $nextDate     = $schedule->next_order_date->format('Y-m-d');
        $deliveryDate = $schedule->expected_delivery_date->format('Y-m-d');
        $dayName      = $schedule->order_day_name;
        $supplierName = $schedule->supplier->name;
        $lowCount     = $this->lowStockCount;

        Mail::send([], [], function ($message) use ($email, $supplierName, $nextDate, $deliveryDate, $dayName, $lowCount) {
            $message->to($email)
                ->subject("📦 تذكير طلبية | {$supplierName} — {$nextDate}")
                ->html("
                    <div dir='rtl' style='font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5;'>
                        <div style='max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden;'>
                            <div style='background: #1e40af; color: white; padding: 20px; text-align: center;'>
                                <h1 style='margin:0; font-size: 20px;'>📦 تذكير طلبية</h1>
                            </div>
                            <div style='padding: 24px;'>
                                <p style='font-size: 16px;'>موعد إرسال طلبية لـ <strong>{$supplierName}</strong> هو <strong>{$dayName} {$nextDate}</strong></p>
                                <div style='background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 16px; margin: 16px 0;'>
                                    <p style='margin:0; font-size: 15px;'>⚠️ يوجد <strong>{$lowCount}</strong> صنف تحت الحد الأدنى تحتاج طلبية</p>
                                </div>
                                <p>📅 تاريخ الاستلام المتوقع: <strong>{$deliveryDate}</strong></p>
                                <p style='color: #6b7280; font-size: 13px; margin-top: 20px;'>يُرجى مراجعة القائمة وإرسال الطلبية في الوقت المناسب.</p>
                            </div>
                        </div>
                    </div>
                ");
        });

        Log::info("Order reminder sent to {$email} for supplier {$supplierName}");
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('SendOrderReminderJob permanently failed', [
            'tenant_id'   => $this->tenantId,
            'schedule_id' => $this->scheduleId,
            'error'       => $exception->getMessage(),
        ]);
    }
}
