<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class VehicleYearModel extends BaseModel
{
    protected $table = 'vehicle_years';

    protected static function booted()
    {
        parent::booted();

        static::updated(function ($model) {
            if ($model->isDirty('engine_image_url') && $model->getOriginal('engine_image_url')) {
                $oldPath = str_replace(\Illuminate\Support\Facades\Storage::disk('public')->url(''), '', $model->getOriginal('engine_image_url'));
                \Illuminate\Support\Facades\Storage::disk('public')->delete(ltrim($oldPath, '/'));
            }
        });

        static::forceDeleted(function ($model) {
            if ($model->engine_image_url) {
                $path = str_replace(\Illuminate\Support\Facades\Storage::disk('public')->url(''), '', $model->engine_image_url);
                \Illuminate\Support\Facades\Storage::disk('public')->delete(ltrim($path, '/'));
            }
        });
    }

    protected $fillable = [
        'model_id',
        'year_from',
        'year_to',
        'engine_size',
        'engine_code',
        'fuel_type',
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
