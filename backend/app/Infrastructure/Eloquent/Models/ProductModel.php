<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

use App\Infrastructure\Eloquent\Traits\NormalizesImageUrls;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ProductModel extends BaseModel
{
    use HasFactory, NormalizesImageUrls;

    protected $table = 'products';

    protected static function booted()
    {
        parent::booted();

        static::updated(function ($model) {
            if ($model->isDirty('image_url') && $model->getOriginal('image_url')) {
                self::deleteImageFile($model->getOriginal('image_url'));
            }
        });

        static::forceDeleted(function ($model) {
            self::deleteImageFile($model->getRawOriginal('image_url'));
        });
    }

    protected $fillable = [
        'name', 'name_ar', 'sku', 'barcode', 'cost_price',
        'sell_price', 'wholesale_price', 'semi_wholesale_price', 'vat_rate', 'stock_alert_level', 'is_active',
        'category_id', 'unit_of_measure', 'description', 'image_url', 'is_favorite',
        'oem_number', 'part_number', 'superseded_by_id', 'brand', 'brand_id', 'quality_grade', 'warranty_months', 'country_of_origin',
        'has_core_charge', 'core_charge_amount', 'is_kit',
        'profit_percent', 'default_discount_percent',
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
        'has_core_charge' => 'boolean',
        'core_charge_amount' => 'decimal:2',
        'is_kit' => 'boolean',
        'profit_percent' => 'decimal:2',
        'default_discount_percent' => 'decimal:2',
    ];

    public function getImageUrlAttribute(?string $value): ?string
    {
        return self::toRelativeUrl($value);
    }

    public function supersededBy()
    {
        return $this->belongsTo(ProductModel::class, 'superseded_by_id');
    }

    public function brandModel()
    {
        return $this->belongsTo(BrandModel::class, 'brand_id');
    }

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

    public function components()
    {
        return $this->belongsToMany(
            ProductModel::class,
            'product_components',
            'parent_product_id',
            'child_product_id'
        )->withPivot('quantity_required')->withTimestamps();
    }

    public function warranties()
    {
        return $this->hasMany(WarrantyModel::class, 'product_id');
    }

    public function alternatives()
    {
        return $this->belongsToMany(
            ProductModel::class,
            'product_alternatives',
            'product_id',
            'alternative_product_id'
        )->withPivot('notes')->withTimestamps();
    }

    public function inverseAlternatives()
    {
        return $this->belongsToMany(
            ProductModel::class,
            'product_alternatives',
            'alternative_product_id',
            'product_id'
        )->withPivot('notes')->withTimestamps();
    }

    public function kitComponents()
    {
        return $this->hasMany(ProductComponentModel::class, 'parent_product_id');
    }

    public function partOfKits()
    {
        return $this->hasMany(ProductComponentModel::class, 'child_product_id');
    }

    public function defaultSupplier()
    {
        return $this->hasOne(ProductDefaultSupplierModel::class, 'product_id')
                    ->where('priority', 1);
    }

    public function allSuppliers()
    {
        return $this->hasMany(ProductDefaultSupplierModel::class, 'product_id')
                    ->with('supplier')
                    ->orderBy('priority');
    }
}
