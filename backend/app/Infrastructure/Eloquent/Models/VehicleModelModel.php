<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VehicleModelModel extends BaseModel
{
    protected $table = 'vehicle_models';

    protected static function booted()
    {
        parent::booted();

        static::updated(function ($model) {
            if ($model->isDirty('image_url') && $model->getOriginal('image_url')) {
                $oldPath = str_replace(\Illuminate\Support\Facades\Storage::disk('public')->url(''), '', $model->getOriginal('image_url'));
                \Illuminate\Support\Facades\Storage::disk('public')->delete(ltrim($oldPath, '/'));
            }
        });

        static::forceDeleted(function ($model) {
            if ($model->image_url) {
                $path = str_replace(\Illuminate\Support\Facades\Storage::disk('public')->url(''), '', $model->image_url);
                \Illuminate\Support\Facades\Storage::disk('public')->delete(ltrim($path, '/'));
            }
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

    public function make(): BelongsTo
    {
        return $this->belongsTo(VehicleMakeModel::class, 'make_id');
    }

    public function years(): HasMany
    {
        return $this->hasMany(VehicleYearModel::class, 'model_id');
    }
}
