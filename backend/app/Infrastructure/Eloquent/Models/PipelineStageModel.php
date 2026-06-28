<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

class PipelineStageModel extends BaseModel
{
    protected $table = 'pipeline_stages';

    protected $fillable = [
        'name',
        'name_ar',
        'color',
        'order_index',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'order_index' => 'integer',
        'is_active' => 'boolean',
    ];

    public function deals()
    {
        return $this->hasMany(DealModel::class, 'stage_id')->orderBy('order_index');
    }
}
