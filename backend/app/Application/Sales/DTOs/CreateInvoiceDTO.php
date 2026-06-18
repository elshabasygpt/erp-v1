<?php

declare(strict_types=1);

namespace App\Application\Sales\DTOs;

final class CreateInvoiceDTO
{
    public function __construct(
        public readonly ?string $customerId,
        public readonly string $type, // cash, credit
        public readonly string $warehouseId,
        public readonly array $items, // array of InvoiceItemDTO
        public readonly ?string $notes = null,
        public readonly float $discountPercent = 0,
        public readonly ?string $salesChannelId = null,
        public readonly ?string $dueDate = null,
        public readonly ?string $internalNotes = null,
        public readonly ?string $referenceNo = null,
        public readonly float $paidAmount = 0,
        public readonly ?string $salespersonId = null,
        public readonly string $status = 'draft',
        public readonly bool $creditLimitOverride = false,
        public readonly array $installments = [],
        public readonly ?string $costCenterId = null,
        public readonly ?string $currencyId = null,
        public readonly ?float $exchangeRate = 1.0,
    ) {}

    public static function fromRequest(array $data): self
    {
        $items = array_map(
            fn (array $item) => InvoiceItemDTO::fromArray($item),
            $data['items'] ?? []
        );

        return new self(
            customerId: empty($data['customer_id']) ? null : $data['customer_id'],
            type: $data['type'] ?? 'cash',
            warehouseId: $data['warehouse_id'],
            items: $items,
            notes: $data['notes'] ?? null,
            discountPercent: (float) ($data['discount_percent'] ?? 0),
            salesChannelId: $data['sales_channel_id'] ?? null,
            dueDate: $data['due_date'] ?? null,
            internalNotes: $data['internal_notes'] ?? null,
            referenceNo: $data['reference_no'] ?? null,
            paidAmount: (float) ($data['paid_amount'] ?? 0),
            salespersonId: $data['salesperson_id'] ?? null,
            status: $data['status'] ?? 'draft',
            creditLimitOverride: (bool) ($data['credit_limit_override'] ?? false),
            installments: $data['installments'] ?? [],
            costCenterId: $data['cost_center_id'] ?? null,
            currencyId: $data['currency_id'] ?? null,
            exchangeRate: isset($data['exchange_rate']) ? (float) $data['exchange_rate'] : 1.0,
        );
    }
}
