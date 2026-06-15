<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class UnitModel extends BaseModel
{
    use HasFactory;

    protected $table = 'units';

    protected $fillable = [
        'name',
        'name_ar',
        'symbol',
        'is_active',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];
}
