<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

class ProductCustomerAliasModel extends BaseModel
{
    protected $table = 'product_customer_aliases';

    protected $fillable = [
        'product_id', 'customer_id', 'alias_name',
    ];

    public function product()
    {
        return $this->belongsTo(ProductModel::class, 'product_id');
    }

    public function customer()
    {
        return $this->belongsTo(CustomerModel::class, 'customer_id');
    }
}
