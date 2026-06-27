<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkshopJobCardPartModel extends BaseModel
{
    protected $table = 'workshop_job_card_parts';

    protected $fillable = [
        'tenant_id', 'job_card_id', 'product_id', 'warehouse_id',
        'quantity', 'unit_price', 'total', 'stock_deducted',
    ];

    protected $casts = [
        'quantity'       => 'decimal:2',
        'unit_price'     => 'decimal:2',
        'total'          => 'decimal:2',
        'stock_deducted' => 'boolean',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(ProductModel::class, 'product_id');
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(WarehouseModel::class, 'warehouse_id');
    }
}
