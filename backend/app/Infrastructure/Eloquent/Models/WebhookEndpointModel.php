<?php

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class WebhookEndpointModel extends Model
{
    use HasFactory, SoftDeletes, HasUuids;

    protected $table = 'webhook_endpoints';
    protected $connection = 'tenant';

    protected $fillable = [
        'url',
        'name',
        'events',
        'secret',
        'is_active',
    ];

    protected $casts = [
        'events' => 'array',
        'is_active' => 'boolean',
    ];

    public function logs()
    {
        return $this->hasMany(WebhookLogModel::class, 'endpoint_id');
    }
}
