<?php

namespace Tests\Unit\Domain\Approvals;

use App\Application\Approvals\UseCases\ApproveRequestUseCase;
use App\Application\Approvals\UseCases\RejectRequestUseCase;
use App\Application\Sales\UseCases\ConfirmInvoiceUseCase;
use App\Domain\Approvals\Entities\ApprovalRequest;
use App\Domain\Approvals\Repositories\ApprovalRepositoryInterface;
use InvalidArgumentException;
use PHPUnit\Framework\MockObject\MockObject;
use Tests\TestCase;

class ApproveRequestUseCaseTest extends TestCase
{
    private ApprovalRepositoryInterface&MockObject $repo;

    protected function setUp(): void
    {
        parent::setUp();

        $this->repo = $this->createMock(ApprovalRepositoryInterface::class);
    }

    /**
     * Approving an invoice triggers ConfirmInvoiceUseCase, but these cases all use
     * a non-invoice requestable type, so the real (container-resolved) confirm
     * use-case is wired in but never invoked.
     */
    private function approveUseCase(): ApproveRequestUseCase
    {
        return new ApproveRequestUseCase($this->repo, app(ConfirmInvoiceUseCase::class));
    }

    private function makeRequest(string $status): ApprovalRequest
    {
        return new ApprovalRequest(
            id: 1,
            tenantId: 1,
            requestableType: 'PurchaseInvoice',
            requestableId: 10,
            requestedBy: 2,
            status: $status,
            assignedTo: 3,
            notes: null,
            decidedAt: null,
        );
    }

    public function test_approves_pending_request_successfully(): void
    {
        $request = $this->makeRequest('pending');

        $this->repo->method('findById')->willReturn($request);
        $this->repo->expects($this->once())
            ->method('updateStatus')
            ->with(1, 'approved', 3, null);

        $useCase = $this->approveUseCase();
        $useCase->execute(1, 3);
    }

    public function test_throws_when_approving_non_pending_request(): void
    {
        $request = $this->makeRequest('approved');

        $this->repo->method('findById')->willReturn($request);

        $this->expectException(InvalidArgumentException::class);

        $useCase = $this->approveUseCase();
        $useCase->execute(1, 3);
    }

    public function test_rejects_pending_request_successfully(): void
    {
        $request = $this->makeRequest('pending');

        $this->repo->method('findById')->willReturn($request);
        $this->repo->expects($this->once())
            ->method('updateStatus')
            ->with(1, 'rejected', 3, 'لا يتوافق مع الميزانية');

        $useCase = new RejectRequestUseCase($this->repo);
        $useCase->execute(1, 3, 'لا يتوافق مع الميزانية');
    }

    public function test_throws_when_request_not_found(): void
    {
        $this->repo->method('findById')->willReturn(null);

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Approval request not found');

        $useCase = $this->approveUseCase();
        $useCase->execute(999, 3);
    }
}
