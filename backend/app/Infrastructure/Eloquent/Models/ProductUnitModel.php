<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class ProductUnitModel extends Model
{
    use HasUuids;

    protected $table = 'product_units';
    protected $connection = 'tenant';

    protected $fillable = [
        'product_id',
        'unit_name',
        'conversion_factor',
        'barcode',
        'sell_price'
    ];

    protected $casts = [
        'conversion_factor' => 'decimal:4',
        'sell_price' => 'decimal:2',
    ];

    public function product()
    {
        return $this->belongsTo(ProductModel::class, 'product_id');
    }
}
