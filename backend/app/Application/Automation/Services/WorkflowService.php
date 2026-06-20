<?php

namespace App\Application\Automation\Services;

use App\Infrastructure\Eloquent\Models\Automation\WorkflowModel;

class WorkflowService
{
    public function __construct(
        private readonly string $tenantId
    ) {}

    public function getWorkflows(): array
    {
        $workflows = WorkflowModel::where('tenant_id', $this->tenantId)
            ->orderBy('created_at', 'desc')
            ->get();

        return $workflows->toArray();
    }

    public function getWorkflow(string $id): ?array
    {
        $workflow = WorkflowModel::where('tenant_id', $this->tenantId)->find($id);
        return $workflow ? $workflow->toArray() : null;
    }

    public function saveWorkflow(array $data): array
    {
        $workflow = WorkflowModel::updateOrCreate(
            ['id' => $data['id'] ?? null, 'tenant_id' => $this->tenantId],
            [
                'name' => $data['name'] ?? 'Untitled Workflow',
                'trigger_type' => $data['trigger_type'] ?? 'manual',
                'is_active' => $data['is_active'] ?? true,
                'nodes_json' => $data['nodes_json'] ?? [],
                'edges_json' => $data['edges_json'] ?? [],
            ]
        );

        return $workflow->toArray();
    }

    public function deleteWorkflow(string $id): void
    {
        WorkflowModel::where('tenant_id', $this->tenantId)
            ->where('id', $id)
            ->delete();
    }
}
