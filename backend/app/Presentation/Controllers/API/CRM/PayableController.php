<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\CRM;

use App\Application\Purchases\UseCases\GetSupplierAgingReportUseCase;
use App\Application\Purchases\UseCases\GetSupplierStatementUseCase;
use App\Presentation\Controllers\API\BaseTenantController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PayableController extends BaseTenantController
{
    public function __construct(
        private readonly GetSupplierAgingReportUseCase $getSupplierAgingReportUseCase,
        private readonly GetSupplierStatementUseCase $getSupplierStatementUseCase
    ) {}

    public function agingReport(Request $request): JsonResponse
    {
        $report = $this->getSupplierAgingReportUseCase->execute((string) $this->getTenantId($request));

        return $this->success($report);
    }

    public function statement(string $supplierId, Request $request): JsonResponse
    {
        $fromDate = $request->query('from_date');
        $toDate   = $request->query('to_date');

        $supplier = DB::connection('tenant')
            ->table('suppliers')
            ->where('id', $supplierId)
            ->select('id', 'name', 'phone', 'email', 'address')
            ->first();

        if (!$supplier) {
            return $this->error('Supplier not found', 404);
        }

        $statement = $this->getSupplierStatementUseCase->execute(
            (string) $this->getTenantId($request),
            $supplierId,
            $fromDate,
            $toDate
        );

        return $this->success(array_merge(['supplier' => $supplier], $statement));
    }
}
