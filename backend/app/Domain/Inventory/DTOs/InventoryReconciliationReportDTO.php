<?php

declare(strict_types=1);

namespace App\Domain\Inventory\DTOs;

class InventoryReconciliationReportDTO
{
    public function __construct(
        public readonly float $glBalance,
        public readonly float $inventoryValuation,
        public readonly float $difference,
        public readonly bool $isReconciled,
        public readonly array $warehouseBreakdown,
        public readonly array $productBreakdown
    ) {}

    public function toArray(): array
    {
        return [
            'gl_balance' => $this->glBalance,
            'inventory_valuation' => $this->inventoryValuation,
            'difference' => $this->difference,
            'is_reconciled' => $this->isReconciled,
            'warehouse_breakdown' => $this->warehouseBreakdown,
            'product_breakdown' => $this->productBreakdown,
            'generated_at' => now()->toIso8601String(),
        ];
    }
}
