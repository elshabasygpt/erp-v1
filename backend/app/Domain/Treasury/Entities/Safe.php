<?php

namespace App\Domain\Treasury\Entities;

class Safe
{
    public function __construct(
        public readonly ?int $id,
        public readonly int $tenantId,
        public readonly string $name,
        public readonly float $balance,
        public readonly string $currency,
        public readonly bool $isDefault,
    ) {}

    public static function create(array $data): self
    {
        return new self(
            id: null,
            tenantId: $data['tenant_id'],
            name: $data['name'],
            balance: (float) ($data['balance'] ?? 0),
            currency: $data['currency'] ?? 'SAR',
            isDefault: (bool) ($data['is_default'] ?? false),
        );
    }
}
