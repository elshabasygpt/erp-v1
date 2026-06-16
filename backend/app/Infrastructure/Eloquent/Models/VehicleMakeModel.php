<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;

class VehicleMakeModel extends BaseModel
{
    protected $table = 'vehicle_makes';

    protected $fillable = [
        'name',
        'name_ar',
        'logo_url',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function models(): HasMany
    {
        return $this->hasMany(VehicleModelModel::class, 'make_id');
    }
}
