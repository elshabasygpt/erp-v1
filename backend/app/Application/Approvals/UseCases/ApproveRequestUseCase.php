<?php
namespace App\Application\Approvals\UseCases;

use App\Domain\Approvals\Repositories\ApprovalRepositoryInterface;
use InvalidArgumentException;

class ApproveRequestUseCase
{
    public function __construct(
        private ApprovalRepositoryInterface $repo
    ) {}

    public function execute(int $requestId, int $approverId, ?string $notes = null): void
    {
        $request = $this->repo->findById($requestId);

        if (!$request) {
            throw new InvalidArgumentException('Approval request not found');
        }

        if ($request->status !== 'pending') {
            throw new InvalidArgumentException("Cannot approve a request with status: {$request->status}");
        }

        $this->repo->updateStatus($requestId, 'approved', $approverId, $notes);
    }
}
