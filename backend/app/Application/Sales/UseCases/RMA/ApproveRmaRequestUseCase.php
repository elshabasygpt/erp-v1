<?php

declare(strict_types=1);

namespace App\Application\Sales\UseCases\RMA;

use App\Infrastructure\Eloquent\Models\RMA\RmaRequestModel;
use Illuminate\Support\Facades\DB;

class ApproveRmaRequestUseCase
{
    public function execute(string $rmaId, string $tenantId, string $reviewerId, ?string $notes = null): RmaRequestModel
    {
        return DB::connection('tenant')->transaction(function () use ($rmaId, $tenantId, $reviewerId, $notes) {
            $rma = RmaRequestModel::query()
                ->where('tenant_id', $tenantId)
                ->lockForUpdate()
                ->findOrFail($rmaId);

            if (! $rma->canBeApproved()) {
                throw new \DomainException("RMA {$rma->rma_number} cannot be approved from status '{$rma->status}'.");
            }

            $rma->update([
                'status'      => RmaRequestModel::STATUS_APPROVED,
                'reviewed_by' => $reviewerId,
                'reviewed_at' => now(),
                'notes'       => $notes ? trim(($rma->notes ?? '') . "\n[Approval Note] " . $notes) : $rma->notes,
            ]);

            return $rma->fresh(['customer', 'items.product']);
        });
    }
}
