<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Infrastructure\Eloquent\Models\PartnerModel;
use App\Infrastructure\Eloquent\Models\PartnerAuditLogModel;
use Illuminate\Support\Str;

class PartnerAuth
{
    /**
     * Handle an incoming request — verify partner access token.
     */
    public function handle(Request $request, Closure $next)
    {
        $token = $request->bearerToken();

        if (!$token) {
            return response()->json([
                'success' => false,
                'message' => 'Authentication required.',
            ], 401);
        }

        // Find partner by hashed access token
        $hashedToken = hash('sha256', $token);
        $partner = PartnerModel::where('access_token', $hashedToken)
            ->where('portal_enabled', true)
            ->where('is_active', true)
            ->first();

        if (!$partner) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired token.',
            ], 401);
        }

        // Bind partner to the request for downstream controllers
        $request->merge(['__partner' => $partner]);
        $request->attributes->set('partner', $partner);

        // Log this request (audit trail)
        $this->logAccess($partner, $request);

        return $next($request);
    }

    private function logAccess(PartnerModel $partner, Request $request): void
    {
        // Only log meaningful actions, not every API poll
        $path = $request->path();
        $action = match (true) {
            str_contains($path, 'dashboard') => 'view_dashboard',
            str_contains($path, 'statement/pdf') => 'export_pdf',
            str_contains($path, 'statement') => 'view_statement',
            str_contains($path, 'profits') => 'view_profits',
            str_contains($path, 'top-products') => 'view_top_products',
            str_contains($path, 'forecast') => 'view_forecast',
            str_contains($path, 'me') => 'view_profile',
            default => 'api_access',
        };

        // Throttle audit logs: only log once per action per 5 minutes
        $recentLog = PartnerAuditLogModel::where('partner_id', $partner->id)
            ->where('action', $action)
            ->where('created_at', '>=', now()->subMinutes(5))
            ->exists();

        if (!$recentLog) {
            PartnerAuditLogModel::create([
                'id' => Str::uuid()->toString(),
                'partner_id' => $partner->id,
                'action' => $action,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'created_at' => now(),
            ]);
        }
    }
}
