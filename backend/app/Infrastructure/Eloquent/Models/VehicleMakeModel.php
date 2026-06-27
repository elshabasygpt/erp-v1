<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

use App\Infrastructure\Eloquent\Traits\NormalizesImageUrls;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VehicleMakeModel extends BaseModel
{
    use NormalizesImageUrls;
    protected $table = 'vehicle_makes';

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
        'name_ar',
        'logo_url',
        'is_active',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function getLogoUrlAttribute(?string $value): ?string
    {
        return self::toRelativeUrl($value);
    }

    public function models(): HasMany
    {
        return $this->hasMany(VehicleModelModel::class, 'make_id');
    }
}
