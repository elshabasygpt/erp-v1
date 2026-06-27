<?php

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\SoftDeletes;

class SalesReturnModel extends BaseModel
{
    use SoftDeletes;

    protected $table = 'sales_returns';

    protected $fillable = [
        'return_number',
        'rma_number',
        'invoice_id',
        'customer_id',
        'warehouse_id',
        'return_date',
        'subtotal',
        'vat_amount',
        'total',
        'status',
        'return_type',
        'refund_method',
        'reason',
        'defect_type',
        'approval_status',
        'notes',
        'commission_amount',
        'created_by',
        'updated_by',
        'offline_id',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'vat_amount' => 'decimal:2',
        'total' => 'decimal:2',
        'commission_amount' => 'decimal:2',
        'return_date' => 'datetime',
    ];

    public function items()
    {
        return $this->hasMany(SalesReturnItemModel::class, 'sales_return_id');
    }

    public function customer()
    {
        return $this->belongsTo(CustomerModel::class, 'customer_id');
    }

    public function invoice()
    {
        return $this->belongsTo(InvoiceModel::class, 'invoice_id');
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
