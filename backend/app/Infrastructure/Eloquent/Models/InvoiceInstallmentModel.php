<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

class InvoiceInstallmentModel extends BaseModel
{
    protected $table = 'invoice_installments';

    protected $fillable = [
        'invoice_id',
        'due_date',
        'amount',
        'paid_amount',
        'status',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'due_date' => 'date',
    ];

    public function invoice()
    {
        return $this->belongsTo(InvoiceModel::class, 'invoice_id');
    }

    public function allocations()
    {
        return $this->hasMany(PaymentAllocationModel::class, 'installment_id');
    }
}
