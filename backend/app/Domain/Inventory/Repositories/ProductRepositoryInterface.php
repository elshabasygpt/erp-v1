<?php

declare(strict_types=1);

namespace App\Domain\Inventory\Repositories;

use App\Domain\Inventory\Entities\Product;

interface ProductRepositoryInterface
{
    public function findById(string $id): ?Product;

    public function findBySku(string $sku): ?Product;

    public function findByBarcode(string $barcode): ?Product;

    public function create(Product $product): Product;

    public function update(Product $product): Product;

    public function delete(string $id): bool;

    public function paginate(int $perPage = 15, array $filters = []): array;

    public function getLowStockProducts(string $warehouseId): array;

    public function getStockLevel(string $productId, string $warehouseId): float;

    /**
     * Get stock level with a pessimistic lock (SELECT ... FOR UPDATE).
     * Must be called within a DB transaction.
     */
    public function getStockLevelForUpdate(string $productId, string $warehouseId): float;

    public function adjustStock(string $productId, string $warehouseId, float $quantity, float $averageCost): void;

    public function search(string $query, int $limit = 20): array;
}
