<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Repositories;

use App\Domain\Inventory\Entities\Product;
use App\Domain\Inventory\Repositories\ProductRepositoryInterface;
use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\StockMovementModel;
use App\Infrastructure\Eloquent\Models\WarehouseProductModel;

final class EloquentProductRepository implements ProductRepositoryInterface
{
    public function findById(string $id): ?Product
    {
        $model = ProductModel::query()->find($id);

        return $model ? $this->toDomain($model) : null;
    }

    public function findBySku(string $sku): ?Product
    {
        $model = ProductModel::query()->where('sku', $sku)->first();

        return $model ? $this->toDomain($model) : null;
    }

    public function findByBarcode(string $barcode): ?Product
    {
        $model = ProductModel::query()->where('barcode', $barcode)->first();

        return $model ? $this->toDomain($model) : null;
    }

    public function create(Product $product): Product
    {
        $model = ProductModel::query()->create([
            'id' => $product->getId(),
            'name' => $product->getName(),
            'name_ar' => $product->getNameAr(),
            'sku' => $product->getSku(),
            'barcode' => $product->getBarcode(),
            'cost_price' => $product->getCostPrice(),
            'sell_price' => $product->getSellPrice(),
            'wholesale_price' => $product->getWholesalePrice(),
            'semi_wholesale_price' => $product->getSemiWholesalePrice(),
            'vat_rate' => $product->getVatRate(),
            'stock_alert_level' => $product->getStockAlertLevel(),
            'is_active' => $product->isActive(),
            'category_id' => $product->getCategoryId(),
            'unit_of_measure' => $product->getUnitOfMeasure(),
            'description' => $product->getDescription(),
            'image_url' => $product->getImageUrl(),
        ]);

        return $this->toDomain($model);
    }

    public function update(Product $product): Product
    {
        ProductModel::query()->where('id', $product->getId())->update([
            'name' => $product->getName(),
            'name_ar' => $product->getNameAr(),
            'cost_price' => $product->getCostPrice(),
            'sell_price' => $product->getSellPrice(),
            'wholesale_price' => $product->getWholesalePrice(),
            'semi_wholesale_price' => $product->getSemiWholesalePrice(),
            'vat_rate' => $product->getVatRate(),
            'stock_alert_level' => $product->getStockAlertLevel(),
            'is_active' => $product->isActive(),
            'description' => $product->getDescription(),
            'image_url' => $product->getImageUrl(),
        ]);

        return $this->findById($product->getId());
    }

    public function delete(string $id): bool
    {
        return ProductModel::query()->where('id', $id)->delete() > 0;
    }

    public function paginate(int $perPage = 15, array $filters = []): array
    {
        $query = ProductModel::query()->select([
            'id', 'name', 'name_ar', 'sku', 'barcode', 'cost_price',
            'sell_price', 'wholesale_price', 'semi_wholesale_price', 'image_url', 'superseded_by_id'
        ])->with(['warehouseStocks', 'units', 'supersededBy']);
        if (! empty($filters['search'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('name', 'ilike', "%{$filters['search']}%")
                    ->orWhere('sku', 'ilike', "%{$filters['search']}%")
                    ->orWhere('barcode', 'ilike', "%{$filters['search']}%");
            });
        }
        if (isset($filters['is_active'])) {
            $query->where('is_active', $filters['is_active']);
        }

        return $query->orderBy('name')->paginate($perPage)->toArray();
    }

    public function getLowStockProducts(string $warehouseId): array
    {
        return WarehouseProductModel::join('products', 'warehouse_products.product_id', '=', 'products.id')
            ->where('warehouse_products.warehouse_id', $warehouseId)
            ->whereRaw('warehouse_products.quantity <= products.stock_alert_level')
            ->select('products.*', 'warehouse_products.quantity as current_stock')
            ->get()
            ->toArray();
    }

    public function getStockLevel(string $productId, string $warehouseId): float
    {
        $wp = WarehouseProductModel::query()->where('product_id', $productId)
            ->where('warehouse_id', $warehouseId)
            ->first();

        return $wp ? (float) $wp->quantity : 0;
    }

    public function getStockLevelForUpdate(string $productId, string $warehouseId): float
    {
        $wp = WarehouseProductModel::query()->where('product_id', $productId)
            ->where('warehouse_id', $warehouseId)
            ->lockForUpdate()
            ->first();

        return $wp ? (float) $wp->quantity : 0;
    }

    public function adjustStock(string $productId, string $warehouseId, float $quantity, float $averageCost): void
    {
        $wp = WarehouseProductModel::query()->firstOrCreate(
            ['product_id' => $productId, 'warehouse_id' => $warehouseId],
            ['quantity' => 0, 'average_cost' => 0]
        );

        // Calculate new average cost for incoming stock
        if ($quantity > 0) {
            $totalValue = ($wp->quantity * $wp->average_cost) + ($quantity * $averageCost);
            $newQty = $wp->quantity + $quantity;
            $wp->average_cost = $newQty > 0 ? $totalValue / $newQty : 0;
        }

        $wp->quantity += $quantity;
        $wp->save();

        // Log the stock movement
        StockMovementModel::query()->create([
            'product_id' => $productId,
            'warehouse_id' => $warehouseId,
            'type' => $quantity > 0 ? 'in' : 'out',
            'quantity' => abs($quantity),
            'cost_per_unit' => $averageCost,
        ]);
    }

    public function search(string $query, int $limit = 20): array
    {
        return ProductModel::query()->where('is_active', true)
            ->where(function ($q) use ($query) {
                $q->where('name', 'ilike', "%{$query}%")
                    ->orWhere('name_ar', 'ilike', "%{$query}%")
                    ->orWhere('sku', 'ilike', "%{$query}%")
                    ->orWhere('barcode', $query);
            })
            ->with(['supersededBy', 'warehouseStocks'])
            ->limit($limit)
            ->get()
            ->toArray();
    }

    private function toDomain(ProductModel $model): Product
    {
        return new Product(
            id: $model->id,
            name: $model->name,
            nameAr: $model->name_ar,
            sku: $model->sku,
            barcode: $model->barcode,
            costPrice: (float) $model->cost_price,
            sellPrice: (float) $model->sell_price,
            wholesalePrice: (float) $model->wholesale_price,
            semiWholesalePrice: (float) $model->semi_wholesale_price,
            vatRate: (float) $model->vat_rate,
            stockAlertLevel: $model->stock_alert_level,
            isActive: $model->is_active,
            categoryId: $model->category_id,
            unitOfMeasure: $model->unit_of_measure,
            description: $model->description,
            imageUrl: $model->image_url,
        );
    }
}
