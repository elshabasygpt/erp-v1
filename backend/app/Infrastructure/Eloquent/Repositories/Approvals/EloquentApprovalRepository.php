<?php
namespace App\Infrastructure\Eloquent\Repositories\Approvals;

use App\Domain\Approvals\Entities\ApprovalRequest;
use App\Domain\Approvals\Repositories\ApprovalRepositoryInterface;

class EloquentApprovalRepository implements ApprovalRepositoryInterface
{
    public function findById(string $id): ?ApprovalRequest
    {
        $model = \App\Infrastructure\Eloquent\Models\Approvals\ApprovalRequestModel::find($id);
        if (!$model) return null;

        return new ApprovalRequest(
            id: $model->id,
            tenantId: (string) $model->tenant_id,
            requestableType: (string) $model->requestable_type,
            requestableId: (string) $model->requestable_id,
            requestedBy: (string) $model->requested_by,
            status: $model->status,
            assignedTo: $model->assigned_to ? (string) $model->assigned_to : null,
            notes: $model->notes,
            decidedAt: $model->decided_at?->toDateTimeString(),
        );
    }

    public function findPendingForUser(string $userId): array
    {
        return [];
    }

    public function findPendingOlderThan(int $hours): array
    {
        return [];
    }

    public function save(ApprovalRequest $request): ApprovalRequest
    {
        return $request;
    }

    public function updateStatus(string $id, string $status, string $userId, ?string $notes = null): ApprovalRequest
    {
        $model = \App\Infrastructure\Eloquent\Models\Approvals\ApprovalRequestModel::findOrFail($id);
        $model->update([
            'status' => $status,
            'notes' => $notes,
            'decided_at' => now(),
        ]);

        return $this->findById($id);
    }
}
