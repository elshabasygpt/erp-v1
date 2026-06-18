<?php

declare(strict_types=1);

namespace App\Presentation\Controllers\API\Accounting;

use App\Application\Expenses\DTOs\CreateExpenseVoucherDTO;
use App\Application\Expenses\UseCases\ApproveExpenseVoucherUseCase;
use App\Application\Expenses\UseCases\CreateExpenseVoucherUseCase;
use App\Presentation\Controllers\API\BaseController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExpenseVoucherController extends BaseController
{
    public function __construct(
        private readonly CreateExpenseVoucherUseCase $createUseCase,
        private readonly ApproveExpenseVoucherUseCase $approveUseCase
    ) {}

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category_id' => 'required|uuid|exists:tenant.expense_categories,id',
            'safe_id' => 'required|uuid|exists:tenant.safes,id',
            'amount' => 'required|numeric|min:0.01',
            'expense_date' => 'required|date',
            'description' => 'nullable|string',
        ]);

        try {
            $dto = CreateExpenseVoucherDTO::fromRequest($validated);
            $expense = $this->createUseCase->execute($this->getTenantId($request), $dto, auth()->id() ?? '');

            return $this->success($expense->toArray(), 'Expense voucher created successfully.', 201);
        } catch (\Exception $e) {
            \Log::error('Expense creation failed: '.$e->getMessage());

            return $this->error('Failed to create expense voucher: '.$e->getMessage(), 500);
        }
    }

    public function approve(Request $request, string $id): JsonResponse
    {
        try {
            $expense = $this->approveUseCase->execute($this->getTenantId($request), $id, auth()->id() ?? '');

            return $this->success($expense->toArray(), 'Expense voucher approved and posted successfully.');
        } catch (\DomainException $e) {
            return $this->error($e->getMessage(), 422);
        } catch (\Exception $e) {
            \Log::error('Expense approval failed: '.$e->getMessage());

            return $this->error('Failed to approve expense voucher: '.$e->getMessage(), 500);
        }
    }
}
