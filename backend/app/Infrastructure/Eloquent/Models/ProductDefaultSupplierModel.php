<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

class ProductDefaultSupplierModel extends BaseModel
{
    protected $table = 'product_default_suppliers';

    protected $fillable = [
        'product_id', 'supplier_id', 'reorder_quantity',
        'preferred_unit_price', 'priority', 'created_by',
    ];

    protected $casts = [
        'reorder_quantity'     => 'decimal:2',
        'preferred_unit_price' => 'decimal:2',
        'priority'             => 'integer',
    ];

    public function product()
    {
        return $this->belongsTo(ProductModel::class, 'product_id')
                    ->select(['id', 'name', 'name_ar', 'sku', 'cost_price', 'stock_alert_level']);
    }

    public function supplier()
    {
        return $this->belongsTo(SupplierModel::class, 'supplier_id')
                    ->select(['id', 'name', 'phone']);
    }
}
