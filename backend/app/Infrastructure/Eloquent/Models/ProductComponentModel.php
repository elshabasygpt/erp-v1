<?php

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;

class ProductComponentModel extends BaseModel
{
    use HasUuids;

    protected $table = 'product_components';
    protected $connection = 'tenant';

    protected $fillable = [
        'parent_product_id',
        'child_product_id',
        'quantity_required',
    ];

    public function parentProduct()
    {
        return $this->belongsTo(ProductModel::class, 'parent_product_id');
    }

    public function component()
    {
        return $this->belongsTo(ProductModel::class, 'child_product_id');
    }
}
