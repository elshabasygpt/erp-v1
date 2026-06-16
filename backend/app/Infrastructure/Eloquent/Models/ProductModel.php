<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class ProductModel extends BaseModel
{
    use HasFactory;

    protected $table = 'products';

    protected $fillable = [
        'name', 'name_ar', 'sku', 'barcode', 'cost_price',
        'sell_price', 'wholesale_price', 'semi_wholesale_price', 'vat_rate', 'stock_alert_level', 'is_active',
        'category_id', 'unit_of_measure', 'description', 'image_url', 'is_favorite',
        'oem_number', 'part_number', 'brand', 'quality_grade', 'warranty_months', 'country_of_origin',
        'created_by', 'updated_by',
    ];

    protected $casts = [
        'cost_price' => 'decimal:2',
        'sell_price' => 'decimal:2',
        'wholesale_price' => 'decimal:2',
        'semi_wholesale_price' => 'decimal:2',
        'vat_rate' => 'decimal:2',
        'stock_alert_level' => 'integer',
        'is_active' => 'boolean',
        'is_favorite' => 'boolean',
        'warranty_months' => 'integer',
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

    public function compatibleVehicles()
    {
        return $this->belongsToMany(
            VehicleYearModel::class,
            'product_vehicle_compatibility',
            'product_id',
            'vehicle_year_id'
        )->with(['vehicleModel.make'])->withPivot('notes')->withTimestamps();
    }

    public function warranties()
    {
        return $this->hasMany(WarrantyModel::class, 'product_id');
    }
}
