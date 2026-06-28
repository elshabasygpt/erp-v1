<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Infrastructure\Eloquent\Models\SupplierOrderingScheduleModel;
use App\Jobs\SendOrderReminderJob;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ProcessOrderReminders extends Command
{
    protected $signature   = 'orders:process-reminders';
    protected $description = 'Send order reminders for scheduled suppliers due soon';

    public function handle(): void
    {
        $schedules = SupplierOrderingScheduleModel::where('is_active', true)
            ->with('supplier')
            ->get();

        $sent = 0;

        foreach ($schedules as $schedule) {
            if (!$schedule->reminder_enabled) {
                continue;
            }

            $nextOrderDate     = $schedule->next_order_date;
            $reminderThreshold = now()->addHours($schedule->reminder_hours_before);

            // لو الموعد خلال فترة التذكير
            if ($nextOrderDate->lte($reminderThreshold) && $nextOrderDate->gte(now())) {
                $tenantId = $schedule->tenant_id;
                $lowCount = DB::connection('tenant')
                    ->table('products as p')
                    ->join('warehouse_products as wp', 'p.id', '=', 'wp.product_id')
                    ->join('product_default_suppliers as pds', 'p.id', '=', 'pds.product_id')
                    ->where('p.tenant_id', $tenantId)
                    ->where('pds.supplier_id', $schedule->supplier_id)
                    ->where('pds.priority', 1)
                    ->whereNull('pds.deleted_at')
                    ->whereNull('p.deleted_at')
                    ->where(function ($q) {
                        $q->where('wp.quantity', '<=', 0)
                          ->orWhereColumn('wp.quantity', '<=', 'p.stock_alert_level');
                    })
                    ->count();

                SendOrderReminderJob::dispatch($tenantId, $schedule->id, $lowCount);
                $sent++;

                $this->info("Reminder queued: {$schedule->supplier->name} ({$lowCount} low stock items)");
            }
        }

        $this->info("Total reminders queued: {$sent}");
    }
}
