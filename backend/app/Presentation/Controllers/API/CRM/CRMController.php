<?php

namespace App\Presentation\Controllers\API\CRM;

use App\Presentation\Controllers\API\BaseController;
use App\Application\CRM\Services\CRMService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CRMController extends BaseController
{
    public function getStagesWithDeals(Request $request): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $service = new CRMService($tenantId);

        try {
            $data = $service->getStagesWithDeals();
            return $this->success($data, 'CRM stages and deals retrieved successfully');
        } catch (\Exception $e) {
            return $this->error('Failed to retrieve CRM data: ' . $e->getMessage(), 500);
        }
    }

    public function createDeal(Request $request): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $service = new CRMService($tenantId);

        $validated = $request->validate([
            'stage_id' => 'required|uuid',
            'title' => 'required|string|max:255',
            'expected_value' => 'numeric|min:0',
            'customer_id' => 'nullable|uuid',
            'assigned_to' => 'nullable|uuid',
            'expected_close_date' => 'nullable|date',
            'probability_percent' => 'integer|min:0|max:100',
        ]);

        try {
            $deal = $service->createDeal($validated);
            return $this->success($deal, 'Deal created successfully', 201);
        } catch (\Exception $e) {
            return $this->error('Failed to create deal: ' . $e->getMessage(), 500);
        }
    }

    public function moveDeal(Request $request, $id): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $service = new CRMService($tenantId);

        $validated = $request->validate([
            'new_stage_id' => 'required|uuid',
            'new_order_index' => 'integer|min:0',
        ]);

        try {
            $service->moveDeal($id, $validated['new_stage_id'], $validated['new_order_index'] ?? 0);
            return $this->success([], 'Deal moved successfully');
        } catch (\Exception $e) {
            return $this->error('Failed to move deal: ' . $e->getMessage(), 500);
        }
    }
}
