<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

class CustomerPaymentModel extends BaseModel
{
    protected $table = 'customer_payments';

    protected $fillable = [
        'reference_number',
        'customer_id',
        'payment_date',
        'amount',
        'payment_method',
        'bank_name',
        'transaction_id',
        'notes',
        'created_by',
        'branch_id',
        'status',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'payment_date' => 'date',
    ];

    public function customer()
    {
        return $this->belongsTo(CustomerModel::class, 'customer_id');
    }

    public function allocations()
    {
        return $this->hasMany(PaymentAllocationModel::class, 'payment_id');
    }

    public function branch()
    {
        return $this->belongsTo(BranchModel::class, 'branch_id');
    }
}
