<?php

declare(strict_types=1);

namespace App\Presentation\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Infrastructure\Eloquent\Models\SubscriptionModel;

class SubscriptionActiveMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $tenant = app('current_tenant');

        if (!$tenant) {
            return response()->json(['message' => 'No tenant context.'], 400);
        }

        $subscription = SubscriptionModel::where('tenant_id', $tenant->id)
            ->where('status', 'active')
            ->where('ends_at', '>', now())
            ->first();

        if (!$subscription && !in_array($tenant->status, ['trial', 'active'])) {
            return response()->json([
                'message' => 'Active subscription required. Please renew your subscription.',
                'error' => 'no_active_subscription',
            ], 402);
        }

        return $next($request);
    }
}
