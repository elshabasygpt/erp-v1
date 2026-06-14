<?php

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\SoftDeletes;

class ShippingInvoiceModel extends BaseModel
{
    use SoftDeletes;

    protected $table = 'shipping_invoices';

    protected $fillable = [
        'shipping_number',
        'invoice_id',
        'carrier',
        'tracking_number',
        'shipping_cost',
        'status',
        'shipped_at',
        'delivered_at',
        'shipping_address',
        'notes',
        'created_by',
        'updated_by'
    ];

    protected $casts = [
        'shipping_cost' => 'decimal:2',
        'shipped_at' => 'datetime',
        'delivered_at' => 'datetime'
    ];

    public function salesInvoice()
    {
        return $this->belongsTo(InvoiceModel::class, 'invoice_id');
    }

    public function creator()
    {
        return $this->belongsTo(UserModel::class, 'created_by');
    }
}
