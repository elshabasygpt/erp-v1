<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class DeliveryItemModel extends Model
{
    use SoftDeletes;

    protected $table = 'delivery_items';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'id',
        'tenant_id',
        'delivery_id',
        'product_id',
        'quantity',
        'notes',
    ];

    public function delivery(): BelongsTo
    {
        return $this->belongsTo(DeliveryModel::class, 'delivery_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(ProductModel::class, 'product_id');
    }
}
