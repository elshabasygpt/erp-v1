<?php

declare(strict_types=1);

namespace App\Domain\Inventory\Exports;

use Maatwebsite\Excel\Concerns\Exportable;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;
use App\Domain\Inventory\Exports\Sheets\InstructionsSheet;
use App\Domain\Inventory\Exports\Sheets\ProductsDataSheet;
use App\Domain\Inventory\Exports\Sheets\LookupsSheet;

class ProductExport implements WithMultipleSheets
{
    use Exportable;

    private string $tenantId;
    private ?array $productIds;
    private ?string $searchQuery;
    private ?string $categoryId;
    private ?string $isActive;
    private ?string $brand;
    private ?string $supplierId;
    private ?string $warehouseId;

    public function __construct(
        string $tenantId, 
        ?array $productIds = null, 
        ?string $searchQuery = null, 
        ?string $categoryId = null,
        ?string $isActive = null,
        ?string $brand = null,
        ?string $supplierId = null,
        ?string $warehouseId = null
    ) {
        $this->tenantId = $tenantId;
        $this->productIds = $productIds;
        $this->searchQuery = $searchQuery;
        $this->categoryId = $categoryId;
        $this->isActive = $isActive;
        $this->brand = $brand;
        $this->supplierId = $supplierId;
        $this->warehouseId = $warehouseId;
    }

    public function sheets(): array
    {
        return [
            new InstructionsSheet(),
            new ProductsDataSheet(
                $this->tenantId, 
                $this->productIds, 
                $this->searchQuery, 
                $this->categoryId, 
                $this->isActive, 
                $this->brand, 
                $this->supplierId, 
                $this->warehouseId
            ),
            new LookupsSheet($this->tenantId),
        ];
    }
}
