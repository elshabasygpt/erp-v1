<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Inventory;

use App\Presentation\Controllers\Controller;
use App\Domain\Inventory\Services\InventoryReconciliationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Exception;

class InventoryReconciliationController extends Controller
{
    public function __construct(
        private readonly InventoryReconciliationService $reconciliationService
    ) {}

    public function generate(Request $request): JsonResponse
    {
        try {
            // Assuming tenant_id is injected into the request or handled via middleware
            $tenantId = app('current_tenant'); // or however the framework resolves it
            
            if (!$tenantId) {
                return response()->json(['message' => 'Tenant context missing.'], 400);
            }

            $report = $this->reconciliationService->generateReport($tenantId);

            return response()->json([
                'status' => 'success',
                'data' => $report->toArray()
            ]);
            
        } catch (Exception $e) {
            \Log::error('Inventory Reconciliation Error: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'An error occurred during reconciliation.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
