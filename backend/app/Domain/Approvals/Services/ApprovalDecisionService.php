<?php

namespace App\Domain\Approvals\Services;

use App\Domain\Approvals\Repositories\ApprovalRepositoryInterface;
use InvalidArgumentException;

class ApprovalDecisionService
{
    public function __construct(
        private ApprovalRepositoryInterface $repo
    ) {}

    public function approve(int $requestId, int $approverId, ?string $notes = null): void
    {
        $request = $this->repo->findById($requestId);
        if (! $request) {
            throw new InvalidArgumentException('Approval request not found');
        }
        if ($request->status !== 'pending') {
            throw new InvalidArgumentException('Request is not pending');
        }
        $this->repo->updateStatus($requestId, 'approved', $notes);
    }

    public function reject(int $requestId, int $rejectorId, ?string $notes = null): void
    {
        $request = $this->repo->findById($requestId);
        if (! $request) {
            throw new InvalidArgumentException('Approval request not found');
        }
        if ($request->status !== 'pending') {
            throw new InvalidArgumentException('Request is not pending');
        }
        $this->repo->updateStatus($requestId, 'rejected', $notes);
    }
}
