<?php

namespace App\Infrastructure\Eloquent\Models;

class WarehouseProductModel extends BaseModel
{
    protected $table = 'warehouse_products';

    protected $fillable = [
        'warehouse_id',
        'product_id',
        'quantity',
        'core_quantity',
        'reserved_quantity',
        'average_cost',
        'bin_location',
    ];

    protected $casts = ['quantity' => 'decimal:2', 'core_quantity' => 'decimal:2', 'average_cost' => 'decimal:2'];

    public function product()
    {
        return $this->belongsTo(ProductModel::class, 'product_id');
    }

    public function warehouse()
    {
        return $this->belongsTo(WarehouseModel::class, 'warehouse_id');
    }
}
