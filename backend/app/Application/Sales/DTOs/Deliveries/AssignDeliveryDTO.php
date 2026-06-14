<?php

declare(strict_types=1);

namespace App\Application\Sales\DTOs\Deliveries;

final class AssignDeliveryDTO
{
    public function __construct(
        public readonly ?string $driverId = null,
        public readonly ?string $deliveryPlatformId = null,
        public readonly ?string $trackingCode = null,
        public readonly ?string $eta = null,
        public readonly ?float $deliveryFee = null,
        public readonly ?string $notes = null,
    ) {}

    public static function fromRequest(array $data): self
    {
        return new self(
            driverId: $data['driver_id'] ?? null,
            deliveryPlatformId: $data['delivery_platform_id'] ?? null,
            trackingCode: $data['tracking_code'] ?? null,
            eta: $data['eta'] ?? null,
            deliveryFee: isset($data['delivery_fee']) ? (float) $data['delivery_fee'] : null,
            notes: $data['notes'] ?? null,
        );
    }
}
