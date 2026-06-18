<?php

declare(strict_types=1);

namespace App\Application\Sales\DTOs\Returns;

final class ProcessSalesReturnDTO
{
    public function __construct(
        public readonly string $invoiceId,
        public readonly string $warehouseId,
        public readonly string $customerId,
        public readonly string $returnType, // full, partial, line_return
        public readonly string $refundMethod, // store_credit, cash, bank_transfer
        public readonly ?string $reason = null,
        public readonly ?string $notes = null,
        public readonly array $items = [], // Array of ['productId', 'quantity', 'condition']
    ) {}

    public static function fromRequest(array $data): self
    {
        return new self(
            invoiceId: $data['invoice_id'],
            warehouseId: $data['warehouse_id'],
            customerId: $data['customer_id'],
            returnType: $data['return_type'],
            refundMethod: $data['refund_method'],
            reason: $data['reason'] ?? null,
            notes: $data['notes'] ?? null,
            items: array_map(fn ($i) => [
                'productId' => $i['product_id'],
                'quantity' => (float) $i['quantity'],
                'condition' => $i['condition'] ?? 'good',
            ], $data['items'] ?? [])
        );
    }
}
