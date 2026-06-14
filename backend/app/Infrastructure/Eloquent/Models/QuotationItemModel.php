<?php

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\SoftDeletes;

class QuotationItemModel extends BaseModel
{
    use SoftDeletes;

    protected $table = 'quotation_items';

    protected $fillable = [
        'quotation_id',
        'product_id',
        'quantity',
        'unit_price',
        'vat_rate',
        'total'
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'unit_price' => 'decimal:2',
        'vat_rate' => 'decimal:2',
        'total' => 'decimal:2'
    ];

    public function quotation()
    {
        return $this->belongsTo(QuotationModel::class, 'quotation_id');
    }

    public function product()
    {
        return $this->belongsTo(ProductModel::class, 'product_id');
    }
}
