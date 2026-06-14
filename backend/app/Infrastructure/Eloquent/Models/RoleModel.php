<?php

namespace App\Infrastructure\Eloquent\Models;

use Spatie\Permission\Models\Role as SpatieRole;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class RoleModel extends SpatieRole
{
    use HasUuids;

    /**
     * The database connection that should be used by the model.
     *
     * @var string
     */
    protected $connection = 'tenant';

    protected $casts = [
        'meta_attributes' => 'array',
    ];
}
