<?php

namespace App\Presentation\Controllers\API\Analytics;

use App\Presentation\Controllers\API\BaseController;
use App\Application\Analytics\Services\PredictiveAnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnalyticsController extends BaseController
{
    public function getPredictiveDashboard(Request $request): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $service = new PredictiveAnalyticsService($tenantId);

        try {
            $data = $service->getDashboardData();
            return $this->success($data, 'Predictive analytics data retrieved successfully');
        } catch (\Exception $e) {
            return $this->error('Failed to retrieve analytics data: ' . $e->getMessage(), 500);
        }
    }
}
