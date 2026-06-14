<?php

declare(strict_types=1);

namespace App\Domain\Inventory\Entities;

use App\Domain\Shared\Entity;

final class Product extends Entity
{
    public function __construct(
        ?string $id,
        private string $name,
        private string $nameAr,
        private string $sku,
        private ?string $barcode,
        private float $costPrice,
        private float $sellPrice,
        private float $vatRate,
        private int $stockAlertLevel,
        private bool $isActive = true,
        private ?string $categoryId = null,
        private ?string $unitOfMeasure = 'piece',
        private ?string $description = null,
        private ?string $createdBy = null,
        private ?string $updatedBy = null,
        private ?string $imageUrl = null,
    ) {
        parent::__construct($id);
    }

    public function getName(): string { return $this->name; }
    public function getNameAr(): string { return $this->nameAr; }
    public function getSku(): string { return $this->sku; }
    public function getBarcode(): ?string { return $this->barcode; }
    public function getCostPrice(): float { return $this->costPrice; }
    public function getSellPrice(): float { return $this->sellPrice; }
    public function getVatRate(): float { return $this->vatRate; }
    public function getStockAlertLevel(): int { return $this->stockAlertLevel; }
    public function isActive(): bool { return $this->isActive; }
    public function getCategoryId(): ?string { return $this->categoryId; }
    public function getUnitOfMeasure(): ?string { return $this->unitOfMeasure; }
    public function getDescription(): ?string { return $this->description; }
    public function getImageUrl(): ?string { return $this->imageUrl; }

    public function updatePricing(float $costPrice, float $sellPrice): void
    {
        if ($costPrice < 0 || $sellPrice < 0) {
            throw new \DomainException('Prices cannot be negative.');
        }
        $this->costPrice = $costPrice;
        $this->sellPrice = $sellPrice;
    }

    public function deactivate(): void { $this->isActive = false; }
    public function activate(): void { $this->isActive = true; }

    public function getPriceWithVat(): float
    {
        return $this->sellPrice * (1 + $this->vatRate / 100);
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'name_ar' => $this->nameAr,
            'sku' => $this->sku,
            'barcode' => $this->barcode,
            'cost_price' => $this->costPrice,
            'sell_price' => $this->sellPrice,
            'vat_rate' => $this->vatRate,
            'stock_alert_level' => $this->stockAlertLevel,
            'is_active' => $this->isActive,
            'category_id' => $this->categoryId,
            'unit_of_measure' => $this->unitOfMeasure,
            'description' => $this->description,
            'image_url' => $this->imageUrl,
        ];
    }
}
