<?php

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\SoftDeletes;

class QuotationModel extends BaseModel
{
    use SoftDeletes;

    protected $table = 'quotations';

    protected $fillable = [
        'quotation_number',
        'customer_id',
        'parent_id',
        'revision_number',
        'warehouse_id',
        'issue_date',
        'expiry_date',
        'subtotal',
        'vat_amount',
        'total',
        'status',
        'notes',
        'created_by',
        'updated_by',
        'offline_id',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'vat_amount' => 'decimal:2',
        'total' => 'decimal:2',
        'issue_date' => 'datetime',
        'expiry_date' => 'datetime',
    ];

    public function items()
    {
        return $this->hasMany(QuotationItemModel::class, 'quotation_id');
    }

    public function parent()
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function revisions()
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    public function salesOrders()
    {
        return $this->hasMany(SalesOrderModel::class, 'quotation_id');
    }

    public function warehouse()
    {
        return $this->belongsTo(WarehouseModel::class, 'warehouse_id');
    }

    public function customer()
    {
        return $this->belongsTo(CustomerModel::class, 'customer_id');
    }

    public function creator()
    {
        return $this->belongsTo(UserModel::class, 'created_by');
    }
}
