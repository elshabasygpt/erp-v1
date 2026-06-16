<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class WarrantyClaimModel extends BaseModel
{
    use HasFactory;

    protected $table = 'warranty_claims';

    protected $fillable = [
        'claim_number', 'warranty_id', 'claim_date', 'claim_type',
        'complaint', 'resolution', 'replacement_invoice_id', 'status',
        'resolved_at', 'created_by', 'updated_by'
    ];

    protected $casts = [
        'claim_date' => 'date',
        'resolved_at' => 'datetime',
    ];

    public function warranty()
    {
        return $this->belongsTo(WarrantyModel::class, 'warranty_id');
    }

    public function replacementInvoice()
    {
        return $this->belongsTo(App\Infrastructure\Eloquent\Models\InvoiceModel::class, 'replacement_invoice_id');
    }
}
