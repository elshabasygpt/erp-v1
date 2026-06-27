<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

class ProductAliasModel extends BaseModel
{
    protected $table = 'product_aliases';

    protected $fillable = [
        'product_id', 'alias_name', 'is_default_print', 'sort_order', 'created_by',
    ];

    protected $casts = [
        'is_default_print' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function product()
    {
        return $this->belongsTo(ProductModel::class, 'product_id');
    }
}
