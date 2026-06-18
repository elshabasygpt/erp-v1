<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models\Inventory;

use App\Infrastructure\Eloquent\Models\BaseModel;
use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\PurchaseInvoiceItemModel;
use App\Infrastructure\Eloquent\Models\WarehouseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockLotModel extends BaseModel
{
    protected $table = 'stock_lots';

    protected $fillable = [
        'product_id',
        'warehouse_id',
        'lot_number',
        'serial_number',
        'production_date',
        'expiry_date',
        'quantity',
        'purchase_invoice_item_id',
        'created_by',
    ];

    protected $casts = [
        'production_date' => 'date',
        'expiry_date' => 'date',
        'quantity' => 'decimal:4',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(ProductModel::class, 'product_id');
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(WarehouseModel::class, 'warehouse_id');
    }

    public function purchaseInvoiceItem(): BelongsTo
    {
        return $this->belongsTo(PurchaseInvoiceItemModel::class, 'purchase_invoice_item_id');
    }
}
