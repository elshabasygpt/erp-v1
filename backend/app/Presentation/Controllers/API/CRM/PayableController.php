<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\CRM;

use App\Presentation\Controllers\API\BaseController;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Application\Purchases\UseCases\GetSupplierAgingReportUseCase;

class PayableController extends BaseController
{
    public function __construct(
        private readonly GetSupplierAgingReportUseCase $getSupplierAgingReportUseCase
    ) {}

    public function agingReport(Request $request): JsonResponse
    {
        $report = $this->getSupplierAgingReportUseCase->execute((string) $this->getTenantId($request));

        return $this->success($report);
    }
}
