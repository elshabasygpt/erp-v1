<?php

namespace App\Presentation\Controllers\API\Subscription;

use App\Presentation\Controllers\API\BaseController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SubscriptionController extends BaseController
{
    /**
     * Get current subscription and available plans
     */
    public function current(Request $request)
    {
        $tenantId = $request->header('X-Tenant-ID');
        if (!$tenantId) {
            return $this->error('Tenant ID required', 400);
        }

        $tenant = DB::connection('pgsql')->table('tenants')->where('id', $tenantId)->first();
        if (!$tenant) {
            return $this->error('Tenant not found', 404);
        }

        $subscription = DB::connection('pgsql')->table('subscriptions')
            ->where('tenant_id', $tenantId)
            ->where('status', 'active')
            ->first();

        $plans = DB::connection('pgsql')->table('plans')->where('is_active', true)->get();

        return $this->success([
            'tenant' => $tenant,
            'subscription' => $subscription,
            'available_plans' => $plans
        ]);
    }

    /**
     * Dummy endpoint for Stripe webhook or subscription upgrade/checkout
     */
    public function checkout(Request $request)
    {
        $validated = $request->validate([
            'plan_id' => 'required|exists:pgsql.plans,id',
            'payment_method' => 'required|string',
        ]);

        $tenantId = $request->header('X-Tenant-ID');
        
        // MOCK: In a real app, we would create a Stripe Checkout session or Stripe Payment Intent here.
        // For now, we simulate a successful upgrade.
        
        DB::connection('pgsql')->table('subscriptions')->updateOrInsert(
            ['tenant_id' => $tenantId],
            [
                'plan_id' => $validated['plan_id'],
                'status' => 'active',
                'starts_at' => now(),
                'ends_at' => now()->addMonth(),
                'updated_at' => now()
            ]
        );

        return $this->success(null, 'Subscription upgraded successfully via simulated payment.');
    }
}
