<?php

namespace App\Domain\Treasury\Entities;

class SafeTransaction
{
    public function __construct(
        public readonly ?int $id,
        public readonly int $safeId,
        public readonly string $type,
        public readonly float $amount,
        public readonly string $description,
        public readonly ?int $relatedSafeId,
        public readonly ?string $referenceType,
        public readonly ?int $referenceId,
    ) {}

    public static function create(array $data): self
    {
        return new self(
            id: null,
            safeId: $data['safe_id'],
            type: $data['type'],
            amount: (float) $data['amount'],
            description: $data['description'] ?? '',
            relatedSafeId: $data['related_safe_id'] ?? null,
            referenceType: $data['reference_type'] ?? null,
            referenceId: $data['reference_id'] ?? null,
        );
    }
}
