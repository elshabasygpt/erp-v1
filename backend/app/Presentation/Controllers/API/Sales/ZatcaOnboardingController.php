<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Sales;

use App\Presentation\Controllers\API\BaseController;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Infrastructure\Zatca\ZatcaOnboardingService;

class ZatcaOnboardingController extends BaseController
{
    public function __construct(
        private ZatcaOnboardingService $onboardingService
    ) {}

    /**
     * Submit OTP to get the compliance CSID.
     */
    public function submitOtp(Request $request): JsonResponse
    {
        $request->validate([
            'otp' => 'required|string|min:4'
        ]);

        try {
            $result = $this->onboardingService->issueComplianceCSID($request->get('otp'));
            return $this->success($result, 'ZATCA Onboarding phase 1 completed.');
        } catch (\Exception $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * Check onboarding status.
     */
    public function status(): JsonResponse
    {
        $status = $this->onboardingService->getTenantSetting('zatca_status') ?? 'not_enrolled';
        
        return $this->success([
            'zatca_status' => $status
        ]);
    }
}
