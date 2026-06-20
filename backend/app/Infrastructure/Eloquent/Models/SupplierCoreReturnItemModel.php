<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupplierCoreReturnItemModel extends BaseModel
{
    use HasFactory;

    protected $table = 'supplier_core_return_items';

    protected $fillable = [
        'core_return_id',
        'product_id',
        'quantity',
        'core_value',
        'total_value',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'core_value' => 'decimal:2',
        'total_value' => 'decimal:2',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(ProductModel::class, 'product_id');
    }

    public function coreReturn(): BelongsTo
    {
        return $this->belongsTo(SupplierCoreReturnModel::class, 'core_return_id');
    }
}
