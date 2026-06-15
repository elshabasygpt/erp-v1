<?php

namespace App\Infrastructure\Eloquent\Models;

class SupplierPaymentModel extends BaseModel
{
    protected $table = 'supplier_payments';
    protected $fillable = ['supplier_id', 'purchase_invoice_id', 'amount', 'payment_method', 'reference', 'notes', 'payment_date', 'created_by', 'cost_center_id', 'currency_id', 'exchange_rate'];
    protected $casts = ['amount' => 'decimal:2', 'payment_date' => 'date', 'exchange_rate' => 'decimal:6'];
    public function supplier() { return $this->belongsTo(SupplierModel::class, 'supplier_id'); }
}
