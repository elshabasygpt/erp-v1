<?php

namespace App\Domain\Sales\Entities;

class SalesChannel
{
    private string $id;

    private string $name;

    private string $code;

    private string $type;

    private string $pricingMethod;

    private float $markupPercentage;

    private float $fixedMarkup;

    private bool $applyBeforeTax;

    private bool $isActive;

    private int $sortOrder;

    private ?string $logoUrl;

    public function __construct(
        string $id,
        string $name,
        string $code,
        string $type,
        string $pricingMethod,
        float $markupPercentage,
        float $fixedMarkup,
        bool $applyBeforeTax,
        bool $isActive,
        int $sortOrder,
        ?string $logoUrl = null
    ) {
        $this->id = $id;
        $this->name = $name;
        $this->code = $code;
        $this->type = $type;
        $this->pricingMethod = $pricingMethod;
        $this->markupPercentage = $markupPercentage;
        $this->fixedMarkup = $fixedMarkup;
        $this->applyBeforeTax = $applyBeforeTax;
        $this->isActive = $isActive;
        $this->sortOrder = $sortOrder;
        $this->logoUrl = $logoUrl;
    }

    public function getId(): string
    {
        return $this->id;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function getCode(): string
    {
        return $this->code;
    }

    public function getType(): string
    {
        return $this->type;
    }

    public function getPricingMethod(): string
    {
        return $this->pricingMethod;
    }

    public function getMarkupPercentage(): float
    {
        return $this->markupPercentage;
    }

    public function getFixedMarkup(): float
    {
        return $this->fixedMarkup;
    }

    public function isApplyBeforeTax(): bool
    {
        return $this->applyBeforeTax;
    }

    public function isActive(): bool
    {
        return $this->isActive;
    }

    public function getSortOrder(): int
    {
        return $this->sortOrder;
    }

    public function getLogoUrl(): ?string
    {
        return $this->logoUrl;
    }

    public function calculateMarkup(float $basePrice): float
    {
        if ($this->pricingMethod === 'percentage') {
            return $basePrice * ($this->markupPercentage / 100);
        }

        if ($this->pricingMethod === 'fixed') {
            return $this->fixedMarkup;
        }

        return 0.0;
    }
}
