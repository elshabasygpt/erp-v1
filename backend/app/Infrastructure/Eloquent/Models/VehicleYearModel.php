<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

use App\Infrastructure\Eloquent\Traits\NormalizesImageUrls;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class VehicleYearModel extends BaseModel
{
    use NormalizesImageUrls;
    protected $table = 'vehicle_years';

    protected static function booted()
    {
        parent::booted();

        static::updated(function ($model) {
            if ($model->isDirty('engine_image_url') && $model->getOriginal('engine_image_url')) {
                self::deleteImageFile($model->getOriginal('engine_image_url'));
            }
        });

        static::forceDeleted(function ($model) {
            self::deleteImageFile($model->getRawOriginal('engine_image_url'));
        });
    }

    protected $fillable = [
        'model_id',
        'year_from',
        'year_to',
        'engine_size',
        'engine_code',
        'fuel_type',
        'transmission',
        'engine_image_url',
        'is_active',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'year_from' => 'integer',
        'year_to' => 'integer',
        'is_active' => 'boolean',
    ];

    public function getEngineImageUrlAttribute(?string $value): ?string
    {
        return self::toRelativeUrl($value);
    }

    public function vehicleModel(): BelongsTo
    {
        return $this->belongsTo(VehicleModelModel::class, 'model_id');
    }

    public function compatibleProducts(): BelongsToMany
    {
        return $this->belongsToMany(
            ProductModel::class,
            'product_vehicle_compatibility',
            'vehicle_year_id',
            'product_id'
        )->withPivot('notes')->withTimestamps();
    }
}
