<?php

namespace App\Presentation\Controllers\API\Reports;

use App\Presentation\Controllers\API\BaseTenantController;
use App\Application\Reports\Services\ReportingService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ReportController extends BaseTenantController
{
    public function getProfitAndLoss(Request $request): JsonResponse
    {
        $request->validate([
            'start_date' => 'sometimes|date',
            'end_date'   => 'sometimes|date|after_or_equal:start_date',
        ]);

        $service = new ReportingService(
            tenantId: (string) $this->getTenantId($request)
        );

        $data = $service->getProfitAndLoss(
            $request->query('start_date', now()->startOfMonth()->toDateString()),
            $request->query('end_date', now()->toDateString())
        );

        return $this->success($data);
    }

    public function getVatReport(Request $request): JsonResponse
    {
        $service = new ReportingService(
            tenantId: (string) $this->getTenantId($request)
        );

        $data = $service->getVatReport(
            $request->query('year', date('Y')),
            $request->query('period', 'monthly'),
            $request->query('value', date('m'))
        );

        return $this->success($data);
    }

    public function getInventoryReport(Request $request): JsonResponse
    {
        $service = new ReportingService(
            tenantId: (string) $this->getTenantId($request)
        );

        $data = $service->getInventoryReport(
            $request->only(['warehouse_id', 'category_id', 'low_stock'])
        );

        return $this->success($data);
    }

    public function getAccountsReport(Request $request): JsonResponse
    {
        $service = new ReportingService(
            tenantId: (string) $this->getTenantId($request)
        );

        $data = $service->getAccountsReport();

        return $this->success($data);
    }

    public function getGeneralKpis(Request $request): JsonResponse
    {
        $service = new ReportingService(
            tenantId: (string) $this->getTenantId($request)
        );

        $data = $service->getGeneralKpis();

        return $this->success($data);
    }

    public function getAgingReport(Request $request): JsonResponse
    {
        $service = new ReportingService(
            tenantId: (string) $this->getTenantId($request)
        );

        $data = $service->getAgingReport(
            $request->query('type', 'receivable')
        );

        return $this->success($data);
    }
}

