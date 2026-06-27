<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerCoreReturnItemModel extends BaseModel
{
    protected $table = 'customer_core_return_items';

    protected $fillable = [
        'tenant_id', 'core_return_id', 'product_id',
        'quantity', 'condition', 'unit_deposit_value', 'total', 'notes',
    ];

    protected $casts = [
        'quantity'           => 'decimal:2',
        'unit_deposit_value' => 'decimal:2',
        'total'              => 'decimal:2',
    ];

    public function coreReturn(): BelongsTo
    {
        return $this->belongsTo(CustomerCoreReturnModel::class, 'core_return_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(ProductModel::class, 'product_id');
    }
}
