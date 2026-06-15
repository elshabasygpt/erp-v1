<?php
namespace App\Application\Approvals\UseCases;

use App\Domain\Approvals\Repositories\ApprovalRepositoryInterface;
use InvalidArgumentException;

class RejectRequestUseCase
{
    public function __construct(
        private ApprovalRepositoryInterface $repo
    ) {}

    public function execute(string $requestId, string $rejectorId, ?string $notes = null): void
    {
        $request = $this->repo->findById($requestId);

        if (!$request) {
            throw new InvalidArgumentException('Approval request not found');
        }

        if ($request->status !== 'pending') {
            throw new InvalidArgumentException("Cannot reject a request with status: {$request->status}");
        }

        $this->repo->updateStatus($requestId, 'rejected', $rejectorId, $notes);
    }
}
