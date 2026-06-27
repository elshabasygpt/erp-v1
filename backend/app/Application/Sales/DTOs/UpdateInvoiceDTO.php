<?php

declare(strict_types=1);

namespace App\Application\Sales\DTOs;

final class UpdateInvoiceDTO
{
    public function __construct(
        public readonly string $id,
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
        public readonly ?string $costCenterId = null,
        public readonly ?string $currencyId = null,
        public readonly ?float $exchangeRate = null,
    ) {}

    public static function fromRequest(string $id, array $data, float $defaultVatRate = 15): self
    {
        $items = array_map(
            fn (array $item) => InvoiceItemDTO::fromArray($item, $defaultVatRate),
            $data['items'] ?? []
        );

        return new self(
            id: $id,
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
            costCenterId: $data['cost_center_id'] ?? null,
            currencyId: $data['currency_id'] ?? null,
            exchangeRate: isset($data['exchange_rate']) ? (float) $data['exchange_rate'] : null,
        );
    }
}
