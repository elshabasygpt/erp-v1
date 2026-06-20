<?php

declare(strict_types=1);

namespace App\Application\Purchases\UseCases\CoreReturns;

use App\Infrastructure\Eloquent\Models\SupplierCoreReturnModel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CreateCoreReturnUseCase
{
    public function execute(string $tenantId, string $userId, array $data): SupplierCoreReturnModel
    {
        return DB::connection('tenant')->transaction(function () use ($tenantId, $userId, $data) {
            $returnNumber = 'COR-' . date('Ymd') . '-' . strtoupper(Str::random(4));

            $totalCreditValue = 0;
            foreach ($data['items'] as $item) {
                $totalCreditValue += ($item['quantity'] * $item['core_value']);
            }

            $coreReturn = SupplierCoreReturnModel::query()->create([
                'id' => Str::uuid()->toString(),
                'tenant_id' => $tenantId,
                'supplier_id' => $data['supplier_id'],
                'warehouse_id' => $data['warehouse_id'],
                'return_number' => $returnNumber,
                'status' => 'draft',
                'total_credit_value' => $totalCreditValue,
                'created_by' => $userId,
                'notes' => $data['notes'] ?? null,
            ]);

            foreach ($data['items'] as $item) {
                $coreReturn->items()->create([
                    'id' => Str::uuid()->toString(),
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'core_value' => $item['core_value'],
                    'total_value' => $item['quantity'] * $item['core_value'],
                ]);
            }

            return $coreReturn->load('items');
        });
    }
}
