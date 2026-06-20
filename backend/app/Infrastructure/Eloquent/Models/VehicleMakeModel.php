<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;

class VehicleMakeModel extends BaseModel
{
    protected $table = 'vehicle_makes';

    protected static function booted()
    {
        parent::booted();

        static::updated(function ($model) {
            if ($model->isDirty('logo_url') && $model->getOriginal('logo_url')) {
                $oldPath = str_replace(\Illuminate\Support\Facades\Storage::disk('public')->url(''), '', $model->getOriginal('logo_url'));
                \Illuminate\Support\Facades\Storage::disk('public')->delete(ltrim($oldPath, '/'));
            }
        });

        static::forceDeleted(function ($model) {
            if ($model->logo_url) {
                $path = str_replace(\Illuminate\Support\Facades\Storage::disk('public')->url(''), '', $model->logo_url);
                \Illuminate\Support\Facades\Storage::disk('public')->delete(ltrim($path, '/'));
            }
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

    public function models(): HasMany
    {
        return $this->hasMany(VehicleModelModel::class, 'make_id');
    }
}
