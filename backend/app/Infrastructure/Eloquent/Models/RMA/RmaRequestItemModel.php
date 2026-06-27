<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models\RMA;

use App\Infrastructure\Eloquent\Models\BaseModel;
use App\Infrastructure\Eloquent\Models\ProductModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RmaRequestItemModel extends BaseModel
{
    protected $table = 'rma_request_items';

    protected $fillable = [
        'tenant_id',
        'rma_request_id',
        'product_id',
        'quantity',
        'reason_note',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
    ];

    public function rmaRequest(): BelongsTo
    {
        return $this->belongsTo(RmaRequestModel::class, 'rma_request_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(ProductModel::class, 'product_id');
    }
}
