<?php

declare(strict_types=1);

namespace App\Application\Sales\UseCases\RMA;

use App\Infrastructure\Eloquent\Models\RMA\RmaRequestModel;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CreateRmaRequestUseCase
{
    private const RMA_VALID_DAYS  = 30;
    private const MAX_RMA_RETRIES = 3;

    public function execute(string $tenantId, string $userId, array $data): RmaRequestModel
    {
        $lastException = null;

        for ($attempt = 1; $attempt <= self::MAX_RMA_RETRIES; $attempt++) {
            try {
                return DB::connection('tenant')->transaction(function () use ($tenantId, $userId, $data) {
                    $rmaNumber = $this->generateRmaNumber($tenantId);

                    $rma = RmaRequestModel::query()->create([
                        'id'                    => Str::uuid()->toString(),
                        'tenant_id'             => $tenantId,
                        'rma_number'            => $rmaNumber,
                        'customer_id'           => $data['customer_id'],
                        'invoice_id'            => $data['invoice_id'] ?? null,
                        'return_type'           => $data['return_type'] ?? 'sales_return',
                        'reason_category'       => $data['reason_category'],
                        'reason_details'        => $data['reason_details'] ?? null,
                        'status'                => RmaRequestModel::STATUS_SUBMITTED,
                        'expected_refund_value' => $data['expected_refund_value'] ?? null,
                        'notes'                 => $data['notes'] ?? null,
                        'expires_at'            => now()->addDays(self::RMA_VALID_DAYS),
                        'created_by'            => $userId,
                    ]);

                    foreach ($data['items'] ?? [] as $item) {
                        $rma->items()->create([
                            'id'             => Str::uuid()->toString(),
                            'tenant_id'      => $tenantId,
                            'rma_request_id' => $rma->id,
                            'product_id'     => $item['product_id'],
                            'quantity'       => $item['quantity'],
                            'reason_note'    => $item['reason_note'] ?? null,
                        ]);
                    }

                    return $rma->load(['items.product', 'customer']);
                });
            } catch (UniqueConstraintViolationException $e) {
                // rma_number collision — retry with a freshly generated number
                $lastException = $e;
            }
        }

        throw new \DomainException('Unable to generate a unique RMA number after ' . self::MAX_RMA_RETRIES . ' attempts. Please retry.');
    }

    private function generateRmaNumber(string $tenantId): string
    {
        $year = date('Y');

        // Lock the last row to serialize concurrent inserts.
        // When the table is empty the lock is a no-op; the unique constraint
        // on rma_number acts as the final safety net (retry loop above).
        $last = RmaRequestModel::query()
            ->where('tenant_id', $tenantId)
            ->whereYear('created_at', $year)
            ->lockForUpdate()
            ->orderByDesc('rma_number')
            ->value('rma_number');

        if ($last !== null && preg_match('/RMA-\d{4}-(\d+)$/', $last, $m)) {
            $sequence = (int) $m[1] + 1;
        } else {
            $sequence = RmaRequestModel::query()
                ->where('tenant_id', $tenantId)
                ->whereYear('created_at', $year)
                ->count() + 1;
        }

        return sprintf('RMA-%s-%05d', $year, $sequence);
    }
}
