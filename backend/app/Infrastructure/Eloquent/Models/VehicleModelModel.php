<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

use App\Infrastructure\Eloquent\Traits\NormalizesImageUrls;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VehicleModelModel extends BaseModel
{
    use NormalizesImageUrls;
    protected $table = 'vehicle_models';

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

    protected $fillable = [
        'make_id',
        'name',
        'name_ar',
        'body_type',
        'image_url',
        'is_active',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function getImageUrlAttribute(?string $value): ?string
    {
        return self::toRelativeUrl($value);
    }

    public function make(): BelongsTo
    {
        return $this->belongsTo(VehicleMakeModel::class, 'make_id');
    }

    public function years(): HasMany
    {
        return $this->hasMany(VehicleYearModel::class, 'model_id');
    }
}
