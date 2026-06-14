<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

class PaymentAllocationModel extends BaseModel
{
    protected $table = 'payment_allocations';

    protected $fillable = [
        'payment_id',
        'invoice_id',
        'installment_id',
        'amount',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
    ];

    public function payment()
    {
        return $this->belongsTo(CustomerPaymentModel::class, 'payment_id');
    }

    public function invoice()
    {
        return $this->belongsTo(InvoiceModel::class, 'invoice_id');
    }

    public function installment()
    {
        return $this->belongsTo(InvoiceInstallmentModel::class, 'installment_id');
    }
}
