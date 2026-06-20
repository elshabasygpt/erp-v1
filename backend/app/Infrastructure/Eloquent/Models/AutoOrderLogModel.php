<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

class AutoOrderLogModel extends BaseModel
{
    protected $table = 'auto_order_logs';

    public $softDeletes = false;

    protected $fillable = [
        'supplier_id', 'purchase_invoice_id', 'purchase_order_id', 'trigger',
        'items_count', 'total_amount', 'notification_sent', 'notes',
    ];

    protected $casts = [
        'total_amount'      => 'decimal:2',
        'notification_sent' => 'boolean',
    ];

    public function supplier()
    {
        return $this->belongsTo(SupplierModel::class, 'supplier_id');
    }

    public function purchaseInvoice()
    {
        return $this->belongsTo(PurchaseInvoiceModel::class, 'purchase_invoice_id');
    }

    public function purchaseOrder()
    {
        return $this->belongsTo(PurchaseOrderModel::class, 'purchase_order_id');
    }
}
