<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

class DealModel extends BaseModel
{
    protected $table = 'deals';

    protected $fillable = [
        'stage_id',
        'customer_id',
        'title',
        'expected_value',
        'status',
        'order_index',
        'created_by',
    ];

    protected $casts = [
        'expected_value' => 'decimal:2',
        'order_index' => 'integer',
    ];

    public function stage()
    {
        return $this->belongsTo(PipelineStageModel::class, 'stage_id');
    }
}
