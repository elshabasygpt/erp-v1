<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

class ProductModel extends BaseModel
{
    protected $table = 'products';

    protected $fillable = [
        'name', 'name_ar', 'sku', 'barcode', 'cost_price',
        'sell_price', 'vat_rate', 'stock_alert_level', 'is_active',
        'category_id', 'unit_of_measure', 'description', 'image_url', 'is_favorite',
        'created_by', 'updated_by',
    ];

    protected $casts = [
        'cost_price' => 'decimal:2',
        'sell_price' => 'decimal:2',
        'vat_rate' => 'decimal:2',
        'stock_alert_level' => 'integer',
        'is_active' => 'boolean',
        'is_favorite' => 'boolean',
    ];

    public function warehouseStocks()
    {
        return $this->hasMany(WarehouseProductModel::class, 'product_id');
    }

    public function stockMovements()
    {
        return $this->hasMany(StockMovementModel::class, 'product_id');
    }

    public function units()
    {
        return $this->hasMany(ProductUnitModel::class, 'product_id');
    }
}
