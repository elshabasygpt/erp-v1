<?php

declare(strict_types=1);

namespace App\Application\Sales\DTOs;

final class CreateQuotationDTO
{
    public function __construct(
        public readonly ?string $customerId,
        public readonly ?string $warehouseId,
        public readonly array $items, // array of InvoiceItemDTO equivalent or array
        public readonly ?string $issueDate = null,
        public readonly ?string $expiryDate = null,
        public readonly ?string $notes = null,
        public readonly ?string $parentId = null,
    ) {}

    public static function fromRequest(array $data): self
    {
        return new self(
            customerId: empty($data['customer_id']) ? null : $data['customer_id'],
            warehouseId: empty($data['warehouse_id']) ? null : $data['warehouse_id'],
            items: $data['items'] ?? [],
            issueDate: $data['issue_date'] ?? null,
            expiryDate: $data['expiry_date'] ?? null,
            notes: $data['notes'] ?? null,
            parentId: empty($data['parent_id']) ? null : $data['parent_id'],
        );
    }
}
