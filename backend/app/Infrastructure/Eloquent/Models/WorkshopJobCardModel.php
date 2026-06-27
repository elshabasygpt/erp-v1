<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WorkshopJobCardModel extends BaseModel
{
    protected $table = 'workshop_job_cards';

    protected $fillable = [
        'tenant_id', 'job_number', 'customer_id', 'customer_vehicle_id',
        'technician_id', 'status', 'complaint', 'diagnosis', 'internal_notes',
        'labor_cost', 'parts_cost', 'total_cost', 'discount_amount', 'vat_amount',
        'mileage_in', 'estimated_completion', 'started_at', 'completed_at',
        'invoice_id', 'created_by', 'updated_by',
    ];

    protected $casts = [
        'labor_cost'           => 'decimal:2',
        'parts_cost'           => 'decimal:2',
        'total_cost'           => 'decimal:2',
        'discount_amount'      => 'decimal:2',
        'vat_amount'           => 'decimal:2',
        'mileage_in'           => 'integer',
        'estimated_completion' => 'datetime',
        'started_at'           => 'datetime',
        'completed_at'         => 'datetime',
    ];

    public function parts(): HasMany
    {
        return $this->hasMany(WorkshopJobCardPartModel::class, 'job_card_id');
    }

    public function services(): HasMany
    {
        return $this->hasMany(WorkshopJobCardServiceModel::class, 'job_card_id');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(CustomerModel::class, 'customer_id');
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(CustomerVehicleModel::class, 'customer_vehicle_id');
    }

    public function technician(): BelongsTo
    {
        return $this->belongsTo(UserModel::class, 'technician_id');
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(InvoiceModel::class, 'invoice_id');
    }
}
