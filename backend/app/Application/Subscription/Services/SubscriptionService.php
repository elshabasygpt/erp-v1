<?php

declare(strict_types=1);

namespace App\Application\Subscription\Services;

use Illuminate\Support\Facades\DB;

final class SubscriptionService
{
    /**
     * Check and suspend expired subscriptions.
     * Called by scheduled command.
     */
    public function suspendExpiredTenants(): int
    {
        $count = 0;

        $expiredTenants = DB::connection('pgsql')
            ->table('subscriptions')
            ->join('tenants', 'subscriptions.tenant_id', '=', 'tenants.id')
            ->where('subscriptions.ends_at', '<', now())
            ->where('tenants.status', '!=', 'suspended')
            ->select('tenants.id', 'tenants.name')
            ->get();

        foreach ($expiredTenants as $tenant) {
            DB::connection('pgsql')
                ->table('tenants')
                ->where('id', $tenant->id)
                ->update([
                    'status' => 'suspended',
                    'updated_at' => now(),
                ]);

            DB::connection('pgsql')
                ->table('subscriptions')
                ->where('tenant_id', $tenant->id)
                ->where('status', 'active')
                ->update([
                    'status' => 'expired',
                    'updated_at' => now(),
                ]);

            $count++;
        }

        return $count;
    }

    /**
     * Renew a subscription.
     */
    public function renewSubscription(string $tenantId, string $planId, int $months = 1): void
    {
        $now = now();
        $endsAt = $now->copy()->addMonths($months);

        DB::connection('pgsql')
            ->table('subscriptions')
            ->where('tenant_id', $tenantId)
            ->update([
                'plan_id' => $planId,
                'status' => 'active',
                'starts_at' => $now,
                'ends_at' => $endsAt,
                'updated_at' => $now,
            ]);

        DB::connection('pgsql')
            ->table('tenants')
            ->where('id', $tenantId)
            ->update([
                'status' => 'active',
                'updated_at' => $now,
            ]);
    }
}
