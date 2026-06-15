<?php
namespace App\Domain\Approvals\Repositories;

use App\Domain\Approvals\Entities\ApprovalRequest;

interface ApprovalRepositoryInterface
{
    public function findById(string $id): ?ApprovalRequest;
    public function findPendingForUser(string $userId): array;
    public function findPendingOlderThan(int $hours): array;
    public function save(ApprovalRequest $request): ApprovalRequest;
    public function updateStatus(string $id, string $status, string $decidedBy, ?string $notes = null): ApprovalRequest;
}
