<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockTransferItemModel extends BaseModel
{
    protected $table = 'stock_transfer_items';

    protected $fillable = [
        'id',
        'tenant_id',
        'stock_transfer_id',
        'product_id',
        'quantity',
        'received_quantity',
    ];

    public function transfer(): BelongsTo
    {
        return $this->belongsTo(StockTransferModel::class, 'stock_transfer_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(ProductModel::class, 'product_id');
    }
}
