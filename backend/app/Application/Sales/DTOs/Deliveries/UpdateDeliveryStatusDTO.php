<?php

declare(strict_types=1);

namespace App\Application\Sales\DTOs\Deliveries;

final class UpdateDeliveryStatusDTO
{
    public function __construct(
        public readonly string $status,
        public readonly ?string $notes = null,
    ) {}

    public static function fromRequest(array $data): self
    {
        return new self(
            status: $data['status'],
            notes: $data['notes'] ?? null,
        );
    }
}
