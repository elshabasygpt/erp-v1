<?php

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class WebhookLogModel extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'webhook_logs';
    protected $connection = 'tenant';

    protected $fillable = [
        'endpoint_id',
        'event_name',
        'payload',
        'response_status',
        'response_body',
        'is_successful',
    ];

    protected $casts = [
        'payload' => 'array',
        'is_successful' => 'boolean',
    ];

    public function endpoint()
    {
        return $this->belongsTo(WebhookEndpointModel::class, 'endpoint_id');
    }
}
