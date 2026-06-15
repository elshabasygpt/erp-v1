<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Inventory;

use App\Presentation\Controllers\API\BaseTenantController;
use App\Domain\Inventory\Services\InventoryValuationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InventoryValuationController extends BaseTenantController
{
    public function __construct(
        private InventoryValuationService $inventoryValuationService
    ) {}

    public function report(Request $request): JsonResponse
    {
        try {
            $report = $this->inventoryValuationService->getValuationReport();
            return $this->success($report, 'Inventory valuation report retrieved successfully');
        } catch (\Exception $e) {
            return $this->error('Failed to retrieve inventory valuation report: ' . $e->getMessage(), 500);
        }
    }
}


