<?php

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;

class InventoryAdjustmentItemModel extends BaseModel
{
    use HasUuids;

    protected $table = 'inventory_adjustment_items';
    protected $connection = 'tenant';

    protected $fillable = [
        'inventory_adjustment_id',
        'product_id',
        'expected_quantity',
        'actual_quantity',
        'difference',
        'unit_cost',
    ];

    public function product()
    {
        return $this->belongsTo(ProductModel::class, 'product_id');
    }

    public function adjustment()
    {
        return $this->belongsTo(InventoryAdjustmentModel::class, 'inventory_adjustment_id');
    }
}
