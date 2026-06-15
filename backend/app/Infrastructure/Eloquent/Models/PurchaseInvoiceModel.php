<?php

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class PurchaseInvoiceModel extends BaseModel
{
    use HasFactory;

    protected $table = 'purchase_invoices';
    protected $fillable = ['invoice_number', 'supplier_id', 'subtotal', 'vat_amount', 'total', 'status', 'notes', 'warehouse_id', 'invoice_date', 'created_by', 'updated_by', 'cost_center_id', 'currency_id', 'exchange_rate'];
    protected $casts = ['subtotal' => 'decimal:2', 'vat_amount' => 'decimal:2', 'total' => 'decimal:2', 'invoice_date' => 'datetime', 'exchange_rate' => 'decimal:6'];
    public function items() { return $this->hasMany(PurchaseInvoiceItemModel::class, 'purchase_invoice_id'); }
    public function supplier() { return $this->belongsTo(SupplierModel::class, 'supplier_id'); }
}
