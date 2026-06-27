<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

class ProductCrossReferenceModel extends BaseModel
{
    protected $table = 'product_cross_references';

    protected $fillable = [
        'product_id', 'reference_number', 'normalized_number',
        'reference_brand', 'reference_type', 'notes', 'created_by',
    ];

    public function product()
    {
        return $this->belongsTo(ProductModel::class, 'product_id');
    }

    public static function normalize(string $number): string
    {
        return strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $number) ?? '');
    }
}
