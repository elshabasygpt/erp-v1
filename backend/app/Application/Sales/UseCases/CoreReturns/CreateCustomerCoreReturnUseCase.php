<?php

declare(strict_types=1);

namespace App\Application\Sales\UseCases\CoreReturns;

use App\Infrastructure\Eloquent\Models\CustomerCoreReturnModel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CreateCustomerCoreReturnUseCase
{
    public function execute(string $tenantId, string $userId, array $data): CustomerCoreReturnModel
    {
        return DB::connection('tenant')->transaction(function () use ($tenantId, $userId, $data) {
            $returnNumber = 'CCR-' . date('Ymd') . '-' . strtoupper(Str::random(4));

            $totalRefundValue = 0;
            foreach ($data['items'] as $item) {
                $totalRefundValue += ($item['quantity'] * $item['core_value']);
            }

            $coreReturn = CustomerCoreReturnModel::query()->create([
                'id'                => Str::uuid()->toString(),
                'tenant_id'         => $tenantId,
                'customer_id'       => $data['customer_id'],
                'warehouse_id'      => $data['warehouse_id'],
                'return_number'     => $returnNumber,
                'status'            => 'draft',
                'total_refund_value' => $totalRefundValue,
                'created_by'        => $userId,
                'notes'             => $data['notes'] ?? null,
            ]);

            foreach ($data['items'] as $item) {
                $coreReturn->items()->create([
                    'id'          => Str::uuid()->toString(),
                    'product_id'  => $item['product_id'],
                    'quantity'    => $item['quantity'],
                    'core_value'  => $item['core_value'],
                    'total_value' => $item['quantity'] * $item['core_value'],
                ]);
            }

            return $coreReturn->load('items');
        });
    }
}
