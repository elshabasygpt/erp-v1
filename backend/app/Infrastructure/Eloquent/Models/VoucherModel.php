<?php

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\SoftDeletes;

class VoucherModel extends BaseModel
{
    use HasUuids, SoftDeletes;

    protected $table = 'vouchers';
    protected $connection = 'tenant';

    protected $fillable = [
        'reference_number',
        'type',
        'amount',
        'date',
        'customer_id',
        'supplier_id',
        'branch_id',
        'notes',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'date' => 'date',
    ];

    public function customer()
    {
        return $this->belongsTo(CustomerModel::class, 'customer_id');
    }

    public function branch()
    {
        return $this->belongsTo(BranchModel::class, 'branch_id');
    }

    public function supplier()
    {
        return $this->belongsTo(SupplierModel::class, 'supplier_id');
    }
}
