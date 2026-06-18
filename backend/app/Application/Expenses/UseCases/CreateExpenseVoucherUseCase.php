<?php

declare(strict_types=1);

namespace App\Application\Expenses\UseCases;

use App\Application\Expenses\DTOs\CreateExpenseVoucherDTO;
use App\Infrastructure\Eloquent\Models\ExpenseModel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class CreateExpenseVoucherUseCase
{
    public function execute(string $tenantId, CreateExpenseVoucherDTO $dto, string $userId): ExpenseModel
    {
        return DB::connection('tenant')->transaction(function () use ($tenantId, $dto, $userId) {
            $voucherNumber = 'EXP-'.date('Ymd').'-'.strtoupper(Str::random(4));

            $expense = ExpenseModel::query()->create([
                'id' => Str::uuid()->toString(),
                'tenant_id' => $tenantId,
                'voucher_number' => $voucherNumber,
                'category_id' => $dto->categoryId,
                'safe_id' => $dto->safeId,
                'amount' => $dto->amount,
                'description' => $dto->description,
                'expense_date' => $dto->expenseDate,
                'status' => 'draft',
                'created_by' => $userId,
            ]);

            return $expense;
        });
    }
}
