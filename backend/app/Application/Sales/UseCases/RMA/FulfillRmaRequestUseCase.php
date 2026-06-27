<?php

declare(strict_types=1);

namespace App\Application\Sales\UseCases\RMA;

use App\Infrastructure\Eloquent\Models\RMA\RmaRequestModel;
use Illuminate\Support\Facades\DB;

class FulfillRmaRequestUseCase
{
    /**
     * Link an approved RMA to its resulting return document and mark it fulfilled.
     *
     * $referenceType: 'sales_return' | 'customer_core_return'
     * $referenceId:   UUID of the SalesReturnModel or CustomerCoreReturnModel
     */
    public function execute(
        string $rmaId,
        string $tenantId,
        string $referenceType,
        string $referenceId
    ): RmaRequestModel {
        return DB::connection('tenant')->transaction(function () use ($rmaId, $tenantId, $referenceType, $referenceId) {
            $rma = RmaRequestModel::query()
                ->where('tenant_id', $tenantId)
                ->lockForUpdate()
                ->findOrFail($rmaId);

            if (! $rma->canBeFulfilled()) {
                throw new \DomainException("RMA {$rma->rma_number} cannot be fulfilled (status: {$rma->status}).");
            }

            $allowedTypes = ['sales_return', 'customer_core_return'];
            if (! in_array($referenceType, $allowedTypes, true)) {
                throw new \InvalidArgumentException("Invalid reference type: {$referenceType}.");
            }

            $rma->update([
                'status'                   => RmaRequestModel::STATUS_FULFILLED,
                'fulfilled_at'             => now(),
                'fulfilled_reference_type' => $referenceType,
                'fulfilled_reference_id'   => $referenceId,
            ]);

            // Back-fill the rma_request_id on the linked return record
            $this->updateReturnRecord($referenceType, $referenceId, $rma->id, $tenantId);

            return $rma->fresh(['customer', 'items.product']);
        });
    }

    private function updateReturnRecord(
        string $referenceType,
        string $referenceId,
        string $rmaId,
        string $tenantId
    ): void {
        $table = match ($referenceType) {
            'sales_return'          => 'sales_returns',
            'customer_core_return'  => 'customer_core_returns',
        };

        $affected = DB::connection('tenant')
            ->table($table)
            ->where('id', $referenceId)
            ->where('tenant_id', $tenantId)
            ->update(['rma_request_id' => $rmaId]);

        if ($affected === 0) {
            throw new \DomainException("Reference record '{$referenceId}' not found in {$table} for this tenant.");
        }
    }
}
