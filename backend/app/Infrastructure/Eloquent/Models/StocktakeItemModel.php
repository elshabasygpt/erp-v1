<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StocktakeItemModel extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'inventory_stocktake_items';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'stocktake_id',
        'product_id',
        'bin_location',
        'expected_quantity',
        'counted_quantity',
        'difference',
        'unit_cost',
        'variance_value',
        'notes',
        'counted_by',
        'is_recounted',
    ];

    protected $casts = [
        'is_recounted' => 'boolean',
    ];

    public function stocktake(): BelongsTo
    {
        return $this->belongsTo(StocktakeModel::class, 'stocktake_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(ProductModel::class, 'product_id');
    }
}
