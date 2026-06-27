<?php

declare(strict_types=1);

namespace App\Application\Sales\UseCases\RMA;

use App\Infrastructure\Eloquent\Models\RMA\RmaRequestModel;
use Illuminate\Support\Facades\DB;

class RejectRmaRequestUseCase
{
    public function execute(string $rmaId, string $tenantId, string $reviewerId, string $rejectionReason): RmaRequestModel
    {
        return DB::connection('tenant')->transaction(function () use ($rmaId, $tenantId, $reviewerId, $rejectionReason) {
            $rma = RmaRequestModel::query()
                ->where('tenant_id', $tenantId)
                ->lockForUpdate()
                ->findOrFail($rmaId);

            if (! $rma->canBeRejected()) {
                throw new \DomainException("RMA {$rma->rma_number} cannot be rejected from status '{$rma->status}'.");
            }

            $rma->update([
                'status'           => RmaRequestModel::STATUS_REJECTED,
                'rejection_reason' => $rejectionReason,
                'reviewed_by'      => $reviewerId,
                'reviewed_at'      => now(),
            ]);

            return $rma->fresh(['customer']);
        });
    }
}
