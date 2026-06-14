<?php

declare(strict_types=1);

namespace App\Application\Sales\DTOs;

final class CreateSalesOrderDTO
{
    public function __construct(
        public readonly string $customerId,
        public readonly string $warehouseId,
        public readonly array $items, // array of arrays or DTOs
        public readonly ?string $quotationId = null,
        public readonly ?string $deliveryDate = null,
        public readonly ?string $notes = null,
        public readonly string $status = 'draft',
    ) {}

    public static function fromRequest(array $data): self
    {
        return new self(
            customerId: $data['customer_id'],
            warehouseId: $data['warehouse_id'],
            items: $data['items'] ?? [],
            quotationId: empty($data['quotation_id']) ? null : $data['quotation_id'],
            deliveryDate: $data['delivery_date'] ?? null,
            notes: $data['notes'] ?? null,
            status: $data['status'] ?? 'draft',
        );
    }
}
