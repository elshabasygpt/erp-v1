<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkshopJobCardServiceModel extends BaseModel
{
    protected $table = 'workshop_job_card_services';

    protected $fillable = [
        'tenant_id', 'job_card_id', 'description', 'hours', 'rate_per_hour', 'total',
    ];

    protected $casts = [
        'hours'        => 'decimal:2',
        'rate_per_hour'=> 'decimal:2',
        'total'        => 'decimal:2',
    ];

    public function jobCard(): BelongsTo
    {
        return $this->belongsTo(WorkshopJobCardModel::class, 'job_card_id');
    }
}
