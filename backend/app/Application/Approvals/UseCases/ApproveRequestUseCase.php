<?php

namespace App\Application\Approvals\UseCases;

use App\Application\Sales\UseCases\ConfirmInvoiceUseCase;
use App\Domain\Approvals\Repositories\ApprovalRepositoryInterface;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class ApproveRequestUseCase
{
    public function __construct(
        private ApprovalRepositoryInterface $repo,
        private ConfirmInvoiceUseCase $confirmInvoice,
    ) {}

    public function execute(string $requestId, string $approverId, ?string $notes = null): void
    {
        $request = $this->repo->findById($requestId);

        if (! $request) {
            throw new InvalidArgumentException('Approval request not found');
        }

        if ($request->status !== 'pending') {
            throw new InvalidArgumentException("Cannot approve a request with status: {$request->status}");
        }

        DB::connection('tenant')->transaction(function () use ($requestId, $approverId, $notes, $request) {
            $this->repo->updateStatus($requestId, 'approved', $approverId, $notes);

            // Completion side-effect: an approved invoice must actually be confirmed
            // (locked stock deduction + balanced journal entry), otherwise it stays
            // stranded forever in `pending_approval`. ConfirmInvoiceUseCase is the
            // single source of truth for confirmation; if it throws (e.g. stock ran
            // out while the invoice awaited approval) the whole approval rolls back.
            //
            // Other entity types are completed by their own flows: `stock_transfer`
            // is gated inside StockTransferService, `return` by the returns flow.
            if ($request->requestableType === 'invoice') {
                $this->confirmInvoice->execute($request->requestableId, $approverId);
            }
        });
    }
}
