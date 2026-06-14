<?php

namespace App\Infrastructure\Eloquent\Models;

class PurchaseInvoiceModel extends BaseModel
{
    protected $table = 'purchase_invoices';
    protected $fillable = ['invoice_number', 'supplier_id', 'subtotal', 'vat_amount', 'total', 'status', 'notes', 'warehouse_id', 'invoice_date', 'created_by', 'updated_by'];
    protected $casts = ['subtotal' => 'decimal:2', 'vat_amount' => 'decimal:2', 'total' => 'decimal:2', 'invoice_date' => 'datetime'];
    public function items() { return $this->hasMany(PurchaseInvoiceItemModel::class, 'purchase_invoice_id'); }
    public function supplier() { return $this->belongsTo(SupplierModel::class, 'supplier_id'); }
}
