<?php
namespace App\Domain\Approvals\Repositories;

use App\Domain\Approvals\Entities\ApprovalRequest;

interface ApprovalRepositoryInterface
{
    public function findById(int $id): ?ApprovalRequest;
    public function findPendingForUser(int $userId): array;
    public function findPendingOlderThan(int $hours): array;
    public function save(ApprovalRequest $request): ApprovalRequest;
    public function updateStatus(int $id, string $status, int $decidedBy, ?string $notes = null): ApprovalRequest;
}
