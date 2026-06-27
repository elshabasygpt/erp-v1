<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

class CustomerProductPriceModel extends BaseTenantModel
{
    protected $table = 'customer_product_prices';

    protected $fillable = [
        'tenant_id',
        'customer_id',
        'product_id',
        'price',
        'valid_from',
        'valid_until',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'price'       => 'decimal:2',
        'valid_from'  => 'date',
        'valid_until' => 'date',
    ];

    public function customer()
    {
        return $this->belongsTo(CustomerModel::class, 'customer_id');
    }

    public function product()
    {
        return $this->belongsTo(ProductModel::class, 'product_id');
    }

    /** Returns price only if today falls within the validity window. */
    public function isActiveToday(): bool
    {
        $today = now()->toDateString();
        if ($this->valid_from && $this->valid_from->toDateString() > $today) {
            return false;
        }
        if ($this->valid_until && $this->valid_until->toDateString() < $today) {
            return false;
        }
        return true;
    }
}
