<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models\Accounting;

use App\Infrastructure\Eloquent\Models\BaseModel;
use App\Infrastructure\Eloquent\Models\SupplierPaymentModel;
use App\Infrastructure\Eloquent\Models\PurchaseInvoiceModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupplierPaymentAllocationModel extends BaseModel
{
    protected $table = 'supplier_payment_allocations';

    protected $fillable = [
        'supplier_payment_id',
        'purchase_invoice_id',
        'amount',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
    ];

    public function supplierPayment(): BelongsTo
    {
        return $this->belongsTo(SupplierPaymentModel::class, 'supplier_payment_id');
    }

    public function purchaseInvoice(): BelongsTo
    {
        return $this->belongsTo(PurchaseInvoiceModel::class, 'purchase_invoice_id');
    }
}
