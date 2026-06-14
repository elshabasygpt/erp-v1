<?php

namespace App\Application\Sales\DTOs;

class SalesChannelDTO
{
    public function __construct(
        public readonly ?string $id,
        public readonly string $name,
        public readonly string $code,
        public readonly string $type,
        public readonly string $pricingMethod,
        public readonly float $markupPercentage,
        public readonly float $fixedMarkup,
        public readonly bool $applyBeforeTax,
        public readonly bool $isActive,
        public readonly int $sortOrder,
        public readonly ?string $logoUrl = null
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            id: $data['id'] ?? null,
            name: $data['name'],
            code: $data['code'],
            type: $data['type'] ?? 'delivery',
            pricingMethod: $data['pricing_method'] ?? 'percentage',
            markupPercentage: (float)($data['markup_percentage'] ?? 0),
            fixedMarkup: (float)($data['fixed_markup'] ?? 0),
            applyBeforeTax: (bool)($data['apply_before_tax'] ?? true),
            isActive: (bool)($data['is_active'] ?? true),
            sortOrder: (int)($data['sort_order'] ?? 0),
            logoUrl: $data['logo_url'] ?? null
        );
    }
}
