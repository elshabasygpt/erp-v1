<?php

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\SoftDeletes;

class SalesOrderItemModel extends BaseModel
{
    use SoftDeletes;

    protected $table = 'sales_order_items';

    protected $fillable = [
        'sales_order_id',
        'product_id',
        'quantity',
        'fulfilled_quantity',
        'unit_price',
        'vat_rate',
        'total'
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'fulfilled_quantity' => 'decimal:2',
        'unit_price' => 'decimal:2',
        'vat_rate' => 'decimal:2',
        'total' => 'decimal:2',
    ];

    public function salesOrder()
    {
        return $this->belongsTo(SalesOrderModel::class, 'sales_order_id');
    }

    public function product()
    {
        return $this->belongsTo(ProductModel::class, 'product_id');
    }
}
