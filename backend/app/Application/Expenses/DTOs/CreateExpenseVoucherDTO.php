<?php

declare(strict_types=1);

namespace App\Application\Expenses\DTOs;

final class CreateExpenseVoucherDTO
{
    public function __construct(
        public readonly string $categoryId,
        public readonly string $safeId,
        public readonly float $amount,
        public readonly string $expenseDate,
        public readonly ?string $description = null
    ) {}

    public static function fromRequest(array $data): self
    {
        return new self(
            categoryId: $data['category_id'],
            safeId: $data['safe_id'],
            amount: (float) $data['amount'],
            expenseDate: $data['expense_date'],
            description: $data['description'] ?? null
        );
    }
}
