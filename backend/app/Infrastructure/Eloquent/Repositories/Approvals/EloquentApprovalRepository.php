<?php
namespace App\Infrastructure\Eloquent\Repositories\Approvals;

use App\Domain\Approvals\Entities\ApprovalRequest;
use App\Domain\Approvals\Repositories\ApprovalRepositoryInterface;

class EloquentApprovalRepository implements ApprovalRepositoryInterface
{
    public function findById(int $id): ?ApprovalRequest
    {
        // Dummy implementation to satisfy interface
        return null;
    }

    public function findPendingForUser(int $userId): array
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

    public function updateStatus(int $id, string $status, int $decidedBy, ?string $notes = null): ApprovalRequest
    {
        // Return a dummy object to satisfy interface return type
        return new ApprovalRequest(
            id: $id,
            tenantId: 1,
            requestableType: 'dummy',
            requestableId: 1,
            requestedBy: 1,
            status: $status,
            assignedTo: null,
            notes: $notes,
            decidedAt: now()->toDateTimeString(),
        );
    }
}
