<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models\Accounting;

use App\Infrastructure\Eloquent\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class CostCenterModel extends BaseModel
{
    use SoftDeletes;
    protected $table = 'cost_centers';

    protected $fillable = [
        'id',
        'tenant_id',
        'parent_id',
        'code',
        'name',
        'type',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }
}
