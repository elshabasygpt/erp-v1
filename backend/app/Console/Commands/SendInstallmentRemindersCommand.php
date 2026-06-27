<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Infrastructure\Eloquent\Models\TenantModel;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SendInstallmentRemindersCommand extends Command
{
    protected $signature   = 'installments:send-reminders';
    protected $description = 'Notify customers about overdue or upcoming installment payments';

    public function handle(): void
    {
        $tenants = TenantModel::where('status', 'active')->pluck('id');
        $notified = 0;
        $today    = now()->toDateString();

        foreach ($tenants as $tenantId) {
            $overdueInstallments = DB::connection('tenant')
                ->table('installment_payments as ip')
                ->join('invoices as i', 'i.id', '=', 'ip.invoice_id')
                ->join('customers as c', 'c.id', '=', 'i.customer_id')
                ->where('i.tenant_id', $tenantId)
                ->where('ip.status', 'pending')
                ->where('ip.due_date', '<', $today)
                ->select([
                    'ip.id as installment_id',
                    'ip.due_date',
                    'ip.amount',
                    'i.invoice_number',
                    'c.id as customer_id',
                    'c.name as customer_name',
                    'c.phone as customer_phone',
                    'c.email as customer_email',
                ])
                ->get();

            foreach ($overdueInstallments as $installment) {
                $this->_notify($tenantId, $installment, 'overdue');
                $notified++;
            }

            $upcomingInstallments = DB::connection('tenant')
                ->table('installment_payments as ip')
                ->join('invoices as i', 'i.id', '=', 'ip.invoice_id')
                ->join('customers as c', 'c.id', '=', 'i.customer_id')
                ->where('i.tenant_id', $tenantId)
                ->where('ip.status', 'pending')
                ->whereBetween('ip.due_date', [$today, now()->addDays(3)->toDateString()])
                ->select([
                    'ip.id as installment_id',
                    'ip.due_date',
                    'ip.amount',
                    'i.invoice_number',
                    'c.id as customer_id',
                    'c.name as customer_name',
                    'c.phone as customer_phone',
                    'c.email as customer_email',
                ])
                ->get();

            foreach ($upcomingInstallments as $installment) {
                $this->_notify($tenantId, $installment, 'upcoming');
                $notified++;
            }
        }

        $this->info("Installment reminders sent: {$notified}");
    }

    private function _notify(string $tenantId, object $installment, string $type): void
    {
        $message = $type === 'overdue'
            ? "عميلنا العزيز {$installment->customer_name}، قسط بقيمة {$installment->amount} على فاتورة {$installment->invoice_number} تأخر عن موعد السداد ({$installment->due_date}). يرجى التواصل معنا."
            : "عميلنا العزيز {$installment->customer_name}، تذكير بموعد قسطك بقيمة {$installment->amount} على فاتورة {$installment->invoice_number} بتاريخ {$installment->due_date}.";

        app(\App\Application\Notifications\CustomerNotificationService::class)->send(
            tenantId: $tenantId,
            customerId: $installment->customer_id,
            channel: 'whatsapp',
            phone: $installment->customer_phone ?? '',
            message: $message,
            context: ['type' => 'installment_reminder', 'installment_type' => $type],
        );

        Log::channel('daily')->info("[installments:{$type}] tenant={$tenantId} customer={$installment->customer_name} due={$installment->due_date} amount={$installment->amount}");
    }
}
