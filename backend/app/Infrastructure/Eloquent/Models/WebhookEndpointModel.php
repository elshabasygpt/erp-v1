<?php

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class WebhookEndpointModel extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

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
