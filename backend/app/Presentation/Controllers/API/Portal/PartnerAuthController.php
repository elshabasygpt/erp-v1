<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Portal;

use App\Infrastructure\Eloquent\Models\PartnerModel;
use App\Infrastructure\Eloquent\Models\PartnerAuditLogModel;
use App\Presentation\Controllers\API\BaseController;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Carbon\Carbon;

class PartnerAuthController extends BaseController
{
    /**
     * POST /api/portal/login — Login with email + password
     */
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
            'tenant_id' => 'required|string',
        ]);

        // Find partner by email in the tenant DB (tenant_id passed from frontend)
        $partner = PartnerModel::where('email', $validated['email'])
            ->where('portal_enabled', true)
            ->where('is_active', true)
            ->first();

        if (!$partner || !Hash::check($validated['password'], $partner->password_hash)) {
            return $this->error('البريد الإلكتروني أو كلمة المرور غير صحيحة.', 401);
        }

        // Generate a new secure access token
        $plainToken = Str::random(80);
        $partner->update([
            'access_token' => hash('sha256', $plainToken),
            'last_login_at' => now(),
        ]);

        // Audit log
        PartnerAuditLogModel::create([
            'id'         => Str::uuid()->toString(),
            'partner_id' => $partner->id,
            'action'     => 'login',
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => now(),
        ]);

        return $this->success([
            'token'   => $plainToken,
            'partner' => [
                'id'                     => $partner->id,
                'name'                   => $partner->name,
                'email'                  => $partner->email,
                'profit_share_percentage' => $partner->profit_share_percentage,
                'capital_amount'         => $partner->capital_amount,
                'total_pending'          => $partner->total_pending,
                'total_withdrawn'        => $partner->total_withdrawn,
            ],
        ], 'تم تسجيل الدخول بنجاح.');
    }

    /**
     * POST /api/portal/magic-link — Send magic link to partner's email
     */
    public function sendMagicLink(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email'     => 'required|email',
            'tenant_id' => 'required|string',
        ]);

        $partner = PartnerModel::where('email', $validated['email'])
            ->where('portal_enabled', true)
            ->where('is_active', true)
            ->first();

        // Always return success (don't leak if email exists)
        if (!$partner) {
            return $this->success(null, 'إذا كان البريد الإلكتروني مسجلاً سيصلك رابط الدخول.');
        }

        $magicToken = Str::random(64);
        $partner->update([
            'magic_link_token'      => hash('sha256', $magicToken),
            'magic_link_expires_at' => now()->addMinutes(30),
        ]);

        // In production: send email with magic link
        // Mail::to($partner->email)->send(new MagicLinkMail($magicToken, $partner));
        // For development: return token directly in response
        $isLocal = app()->environment('local');

        return $this->success(
            $isLocal ? ['magic_token' => $magicToken, 'expires_in' => '30 minutes'] : null,
            'تم إرسال رابط الدخول إلى بريدك الإلكتروني. صالح لمدة 30 دقيقة.'
        );
    }

    /**
     * POST /api/portal/magic-link/verify — Verify magic link token
     */
    public function verifyMagicLink(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token'     => 'required|string',
            'tenant_id' => 'required|string',
        ]);

        $hashedToken = hash('sha256', $validated['token']);

        $partner = PartnerModel::where('magic_link_token', $hashedToken)
            ->where('portal_enabled', true)
            ->where('magic_link_expires_at', '>', now())
            ->first();

        if (!$partner) {
            return $this->error('رابط الدخول غير صالح أو منتهي الصلاحية.', 401);
        }

        // Issue real access token & invalidate magic link
        $plainToken = Str::random(80);
        $partner->update([
            'access_token'          => hash('sha256', $plainToken),
            'magic_link_token'      => null,
            'magic_link_expires_at' => null,
            'last_login_at'         => now(),
        ]);

        PartnerAuditLogModel::create([
            'id'         => Str::uuid()->toString(),
            'partner_id' => $partner->id,
            'action'     => 'login_magic_link',
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => now(),
        ]);

        return $this->success([
            'token'   => $plainToken,
            'partner' => [
                'id'                     => $partner->id,
                'name'                   => $partner->name,
                'email'                  => $partner->email,
                'profit_share_percentage' => $partner->profit_share_percentage,
                'capital_amount'         => $partner->capital_amount,
                'total_pending'          => $partner->total_pending,
                'total_withdrawn'        => $partner->total_withdrawn,
            ],
        ], 'تم تسجيل الدخول بنجاح.');
    }

    /**
     * GET /api/portal/me — Get current partner profile
     */
    public function me(Request $request): JsonResponse
    {
        $partner = $request->attributes->get('partner');

        return $this->success([
            'id'                     => $partner->id,
            'name'                   => $partner->name,
            'email'                  => $partner->email,
            'profit_share_percentage' => $partner->profit_share_percentage,
            'capital_amount'         => $partner->capital_amount,
            'total_pending'          => $partner->total_pending,
            'total_withdrawn'        => $partner->total_withdrawn,
            'last_login_at'          => $partner->last_login_at?->toISOString(),
        ]);
    }

    /**
     * POST /api/portal/logout — Invalidate access token
     */
    public function logout(Request $request): JsonResponse
    {
        $partner = $request->attributes->get('partner');

        PartnerAuditLogModel::create([
            'id'         => Str::uuid()->toString(),
            'partner_id' => $partner->id,
            'action'     => 'logout',
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => now(),
        ]);

        $partner->update(['access_token' => null]);

        return $this->success(null, 'تم تسجيل الخروج بنجاح.');
    }
}
