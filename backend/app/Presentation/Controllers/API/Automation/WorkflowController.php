<?php

namespace App\Presentation\Controllers\API\Automation;

use App\Presentation\Controllers\API\BaseController;
use App\Application\Automation\Services\WorkflowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorkflowController extends BaseController
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $service = new WorkflowService($tenantId);

        try {
            $data = $service->getWorkflows();
            return $this->success($data, 'Workflows retrieved successfully');
        } catch (\Exception $e) {
            return $this->error('Failed to retrieve workflows: ' . $e->getMessage(), 500);
        }
    }

    public function show(Request $request, $id): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $service = new WorkflowService($tenantId);

        try {
            $data = $service->getWorkflow($id);
            if (!$data) {
                return $this->error('Workflow not found', 404);
            }
            return $this->success($data, 'Workflow retrieved successfully');
        } catch (\Exception $e) {
            return $this->error('Failed to retrieve workflow: ' . $e->getMessage(), 500);
        }
    }

    public function store(Request $request): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $service = new WorkflowService($tenantId);

        $validated = $request->validate([
            'id' => 'nullable|uuid',
            'name' => 'nullable|string|max:255',
            'trigger_type' => 'nullable|string|max:255',
            'is_active' => 'nullable|boolean',
            'nodes_json' => 'nullable|array',
            'edges_json' => 'nullable|array',
        ]);

        try {
            $workflow = $service->saveWorkflow($validated);
            return $this->success($workflow, 'Workflow saved successfully');
        } catch (\Exception $e) {
            return $this->error('Failed to save workflow: ' . $e->getMessage(), 500);
        }
    }

    public function destroy(Request $request, $id): JsonResponse
    {
        $tenantId = $this->getTenantId($request);
        $service = new WorkflowService($tenantId);

        try {
            $service->deleteWorkflow($id);
            return $this->success([], 'Workflow deleted successfully');
        } catch (\Exception $e) {
            return $this->error('Failed to delete workflow: ' . $e->getMessage(), 500);
        }
    }
}
