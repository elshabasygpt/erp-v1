<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Analytics;

use App\Presentation\Controllers\API\BaseTenantController;
use App\Application\Analytics\Services\AnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdvancedAnalyticsController extends BaseTenantController
{
    public function salesPerformance(Request $request): JsonResponse
    {
        $service = new AnalyticsService(
            tenantId: (string) $this->getTenantId($request)
        );

        $data = $service->getSalesPerformance(
            $request->only(['start_date', 'end_date', 'interval'])
        );

        return $this->success($data, 'Sales performance retrieved successfully');
    }

    public function profitabilityAnalysis(Request $request): JsonResponse
    {
        $service = new AnalyticsService(
            tenantId: (string) $this->getTenantId($request)
        );

        $data = $service->getProfitabilityAnalysis(
            $request->only(['start_date', 'end_date', 'dimension'])
        );

        return $this->success($data, 'Profitability analysis retrieved successfully');
    }

    public function salesByChannel(Request $request): JsonResponse
    {
        $service = new AnalyticsService(
            tenantId: (string) $this->getTenantId($request)
        );

        $data = $service->getSalesByChannel(
            $request->only(['start_date', 'end_date'])
        );

        return $this->success($data, 'Sales by channel retrieved successfully');
    }

    public function returnsAnalysis(Request $request): JsonResponse
    {
        $service = new AnalyticsService(
            tenantId: (string) $this->getTenantId($request)
        );

        $data = $service->getReturnsAnalysis(
            $request->only(['start_date', 'end_date'])
        );

        return $this->success($data, 'Returns analysis retrieved successfully');
    }

    public function customerLifetimeValue(Request $request): JsonResponse
    {
        $service = new AnalyticsService(
            tenantId: (string) $this->getTenantId($request)
        );

        $data = $service->getCustomerLifetimeValue(
            $request->only(['start_date', 'end_date'])
        );

        return $this->success($data, 'CLV metrics retrieved successfully');
    }

    public function discountAnalysis(Request $request): JsonResponse
    {
        $service = new AnalyticsService(
            tenantId: (string) $this->getTenantId($request)
        );

        $data = $service->getDiscountAnalysis(
            $request->only(['start_date', 'end_date'])
        );

        return $this->success($data, 'Discount analysis retrieved successfully');
    }

    public function topCategories(Request $request): JsonResponse
    {
        $service = new AnalyticsService(
            tenantId: (string) $this->getTenantId($request)
        );

        $data = $service->getTopCategories(
            $request->only(['start_date', 'end_date'])
        );

        return $this->success($data, 'Top categories/types retrieved successfully');
    }

    public function conversionFunnel(Request $request): JsonResponse
    {
        $service = new AnalyticsService(
            tenantId: (string) $this->getTenantId($request)
        );

        $data = $service->getConversionFunnel(
            $request->only(['start_date', 'end_date'])
        );

        return $this->success($data, 'Conversion funnel metrics retrieved successfully');
    }
}
