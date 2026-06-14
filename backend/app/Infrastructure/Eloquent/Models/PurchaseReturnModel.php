<?php

namespace App\Infrastructure\Eloquent\Models;

class PurchaseReturnModel extends BaseModel
{
    protected $table = 'purchase_returns';

    protected $fillable = [
        'number',
        'purchase_invoice_id',
        'supplier_id',
        'issue_date',
        'total_amount',
        'tax_amount',
        'status',
        'notes',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'issue_date' => 'date',
    ];

    public function supplier()
    {
        return $this->belongsTo(SupplierModel::class, 'supplier_id');
    }

    public function purchaseInvoice()
    {
        return $this->belongsTo(PurchaseInvoiceModel::class, 'purchase_invoice_id');
    }

    public function items()
    {
        return $this->hasMany(PurchaseReturnItemModel::class, 'purchase_return_id');
    }
}
