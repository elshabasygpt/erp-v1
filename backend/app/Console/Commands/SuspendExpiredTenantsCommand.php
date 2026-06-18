<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Application\Subscription\Services\SubscriptionService;
use Illuminate\Console\Command;

class SuspendExpiredTenantsCommand extends Command
{
    protected $signature = 'tenants:suspend-expired';

    protected $description = 'Suspend tenants with expired subscriptions';

    public function handle(SubscriptionService $service): int
    {
        $count = $service->suspendExpiredTenants();
        $this->info("Suspended {$count} tenant(s) with expired subscriptions.");

        return self::SUCCESS;
    }
}
