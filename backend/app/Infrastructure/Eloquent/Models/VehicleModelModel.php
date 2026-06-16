<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VehicleModelModel extends BaseModel
{
    protected $table = 'vehicle_models';

    protected $fillable = [
        'make_id',
        'name',
        'name_ar',
        'body_type',
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
