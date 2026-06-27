<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

use App\Infrastructure\Eloquent\Traits\NormalizesImageUrls;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;

class BrandModel extends BaseModel
{
    use HasFactory, SoftDeletes, NormalizesImageUrls;

    protected $table = 'brands';

    protected $fillable = [
        'name',
        'name_ar',
        'image_url',
        'country_of_origin',
        'tenant_id',
    ];

    protected static function booted()
    {
        parent::booted();

        static::updated(function ($model) {
            if ($model->isDirty('image_url') && $model->getOriginal('image_url')) {
                self::deleteImageFile($model->getOriginal('image_url'));
            }
        });

        static::forceDeleted(function ($model) {
            self::deleteImageFile($model->getRawOriginal('image_url'));
        });
    }

    public function getImageUrlAttribute(?string $value): ?string
    {
        return self::toRelativeUrl($value);
    }

    public function products()
    {
        return $this->hasMany(ProductModel::class, 'brand_id');
    }
}
