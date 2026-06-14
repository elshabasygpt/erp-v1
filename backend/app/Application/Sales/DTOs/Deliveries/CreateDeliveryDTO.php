<?php

declare(strict_types=1);

namespace App\Application\Sales\DTOs\Deliveries;

final class CreateDeliveryDTO
{
    public function __construct(
        public readonly string $orderType, // 'sales_order', 'invoice', 'return'
        public readonly string $orderId,
        public readonly string $customerId,
        public readonly ?string $driverId = null,
        public readonly ?string $deliveryPlatformId = null,
        public readonly float $deliveryFee = 0,
        public readonly ?string $notes = null,
        public readonly string $status = 'pending',
    ) {}

    public static function fromRequest(array $data): self
    {
        return new self(
            orderType: $data['order_type'],
            orderId: $data['order_id'],
            customerId: $data['customer_id'],
            driverId: $data['driver_id'] ?? null,
            deliveryPlatformId: $data['delivery_platform_id'] ?? null,
            deliveryFee: (float) ($data['delivery_fee'] ?? 0),
            notes: $data['notes'] ?? null,
            status: $data['status'] ?? 'pending'
        );
    }
}
