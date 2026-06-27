<?php

namespace App\Infrastructure\Eloquent\Repositories\Approvals;

use App\Domain\Approvals\Entities\ApprovalRequest;
use App\Domain\Approvals\Repositories\ApprovalRepositoryInterface;
use App\Infrastructure\Eloquent\Models\Approvals\ApprovalRequestModel;
use Illuminate\Support\Str;

class EloquentApprovalRepository implements ApprovalRepositoryInterface
{
    public function findById(string $id): ?ApprovalRequest
    {
        $model = ApprovalRequestModel::query()->find($id);
        if (! $model) {
            return null;
        }

        return $this->mapToEntity($model);
    }

    public function findPendingForUser(string $userId): array
    {
        return ApprovalRequestModel::query()
            ->where('status', 'pending')
            ->where(function ($q) use ($userId) {
                $q->where('requested_by', $userId)
                  ->orWhere('resolved_by', $userId);
            })
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(fn ($model) => $this->mapToEntity($model))
            ->all();
    }

    public function findPendingOlderThan(int $hours): array
    {
        return ApprovalRequestModel::query()
            ->where('status', 'pending')
            ->where('created_at', '<', now()->subHours($hours))
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(fn ($model) => $this->mapToEntity($model))
            ->all();
    }

    public function save(ApprovalRequest $request): ApprovalRequest
    {
        $model = ApprovalRequestModel::query()->create([
            'id'            => $request->id ?? Str::uuid()->toString(),
            'entity_type'   => $request->requestableType,
            'entity_id'     => $request->requestableId,
            'requested_by'  => $request->requestedBy,
            'status'        => $request->status,
            'notes'         => $request->notes,
        ]);

        return $this->mapToEntity($model);
    }

    public function updateStatus(string $id, string $status, string $userId, ?string $notes = null): ApprovalRequest
    {
        $model = ApprovalRequestModel::query()->findOrFail($id);
        $model->update([
            'status'      => $status,
            'resolved_by' => $userId,
            'notes'       => $notes,
        ]);

        return $this->mapToEntity(ApprovalRequestModel::query()->findOrFail($model->getKey()));
    }

    // ── private helpers ───────────────────────────────────────────────

    private function mapToEntity(ApprovalRequestModel $model): ApprovalRequest
    {
        return new ApprovalRequest(
            id: $model->id,
            tenantId: (string) $model->tenant_id,
            requestableType: (string) $model->entity_type,
            requestableId: (string) $model->entity_id,
            requestedBy: (string) $model->requested_by,
            status: $model->status,
            assignedTo: $model->resolved_by ? (string) $model->resolved_by : null,
            notes: $model->notes,
            decidedAt: $model->escalated_at?->toDateTimeString(),
        );
    }
}
