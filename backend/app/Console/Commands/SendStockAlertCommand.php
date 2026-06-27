<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Application\Notifications\CustomerNotificationService;
use App\Infrastructure\Eloquent\Models\TenantModel;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SendStockAlertCommand extends Command
{
    protected $signature   = 'stock:send-alerts';
    protected $description = 'Notify shop admins about products that hit the stock alert level';

    public function handle(CustomerNotificationService $notifier): void
    {
        $tenants = TenantModel::where('status', 'active')->get(['id', 'name', 'admin_phone', 'admin_email']);
        $total   = 0;

        foreach ($tenants as $tenant) {
            $lowStock = DB::connection('tenant')
                ->table('products as p')
                ->join('warehouse_products as wp', 'p.id', '=', 'wp.product_id')
                ->where('p.tenant_id', $tenant->id)
                ->where('p.is_active', true)
                ->whereNull('p.deleted_at')
                ->where('wp.quantity', '<=', DB::raw('p.stock_alert_level'))
                ->where('p.stock_alert_level', '>', 0)
                ->select([
                    'p.id',
                    'p.name',
                    'p.sku',
                    'p.stock_alert_level',
                    DB::raw('SUM(wp.quantity) as total_qty'),
                ])
                ->groupBy('p.id', 'p.name', 'p.sku', 'p.stock_alert_level')
                ->having('total_qty', '<=', DB::raw('p.stock_alert_level'))
                ->get();

            if ($lowStock->isEmpty()) {
                continue;
            }

            $count   = $lowStock->count();
            $lines   = $lowStock->take(5)->map(fn($r) => "- {$r->name} (SKU: {$r->sku}): {$r->total_qty} متبقي")->implode("\n");
            $suffix  = $count > 5 ? "\n... و" . ($count - 5) . " منتجات أخرى" : '';
            $message = "تنبيه مخزون [{$tenant->name}]: {$count} منتج وصل للحد الأدنى:\n{$lines}{$suffix}\nيرجى مراجعة نظام الـ ERP لإصدار أمر شراء.";

            if ($tenant->admin_phone) {
                $notifier->send(
                    tenantId:   $tenant->id,
                    customerId: '',
                    channel:    'whatsapp',
                    phone:      $tenant->admin_phone,
                    message:    $message,
                    context:    ['type' => 'stock_alert', 'count' => $count],
                );
            }

            Log::channel('daily')->warning("[stock:send-alerts] tenant={$tenant->name} low_count={$count}");
            $total += $count;
        }

        $this->info("Stock alerts sent. Total low-stock items across all tenants: {$total}");
    }
}
