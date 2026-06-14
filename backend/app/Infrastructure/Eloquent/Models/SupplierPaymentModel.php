<?php

namespace App\Infrastructure\Eloquent\Models;

class SupplierPaymentModel extends BaseModel
{
    protected $table = 'supplier_payments';
    protected $fillable = ['supplier_id', 'purchase_invoice_id', 'amount', 'payment_method', 'reference', 'notes', 'payment_date', 'created_by'];
    protected $casts = ['amount' => 'decimal:2', 'payment_date' => 'date'];
    public function supplier() { return $this->belongsTo(SupplierModel::class, 'supplier_id'); }
}
