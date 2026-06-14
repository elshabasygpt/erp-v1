<?php

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\SoftDeletes;

class SalesOrderModel extends BaseModel
{
    use SoftDeletes;

    protected $table = 'sales_orders';

    protected $fillable = [
        'so_number',
        'quotation_id',
        'customer_id',
        'warehouse_id',
        'issue_date',
        'delivery_date',
        'subtotal',
        'vat_amount',
        'total',
        'status',
        'notes',
        'created_by',
        'updated_by'
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'vat_amount' => 'decimal:2',
        'total' => 'decimal:2',
        'issue_date' => 'datetime',
        'delivery_date' => 'datetime'
    ];

    public function items()
    {
        return $this->hasMany(SalesOrderItemModel::class, 'sales_order_id');
    }

    public function quotation()
    {
        return $this->belongsTo(QuotationModel::class, 'quotation_id');
    }

    public function customer()
    {
        return $this->belongsTo(CustomerModel::class, 'customer_id');
    }

    public function warehouse()
    {
        return $this->belongsTo(WarehouseModel::class, 'warehouse_id');
    }

    public function creator()
    {
        return $this->belongsTo(UserModel::class, 'created_by');
    }
}
