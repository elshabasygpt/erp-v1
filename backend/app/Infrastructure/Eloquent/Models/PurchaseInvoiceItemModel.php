<?php

namespace App\Infrastructure\Eloquent\Models;

class PurchaseInvoiceItemModel extends BaseModel
{
    protected $table = 'purchase_invoice_items';
    protected $fillable = ['purchase_invoice_id', 'product_id', 'quantity', 'unit_price', 'vat_rate', 'total'];
    protected $casts = ['quantity' => 'decimal:2', 'unit_price' => 'decimal:2', 'vat_rate' => 'decimal:2', 'total' => 'decimal:2'];
}
