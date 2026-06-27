<?php

namespace App\Infrastructure\Eloquent\Models;

use App\Infrastructure\Eloquent\Traits\NormalizesImageUrls;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;

class SalesChannelModel extends BaseModel
{
    use HasFactory, SoftDeletes, NormalizesImageUrls;

    protected $table = 'sales_channels';

    protected static function booted()
    {
        parent::booted();

        static::updated(function ($model) {
            if ($model->isDirty('logo_url') && $model->getOriginal('logo_url')) {
                self::deleteImageFile($model->getOriginal('logo_url'));
            }
        });

        static::forceDeleted(function ($model) {
            self::deleteImageFile($model->getRawOriginal('logo_url'));
        });
    }

    protected $fillable = [
        'name',
        'code',
        'type',
        'pricing_method',
        'markup_percentage',
        'fixed_markup',
        'apply_before_tax',
        'is_active',
        'sort_order',
        'logo_url',
    ];

    public function getLogoUrlAttribute(?string $value): ?string
    {
        return self::toRelativeUrl($value);
    }

    protected $casts = [
        'markup_percentage' => 'float',
        'fixed_markup' => 'float',
        'apply_before_tax' => 'boolean',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];
}
