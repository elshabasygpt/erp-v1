<?php

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class SafeUserModel extends Pivot
{
    protected $table = 'safe_users';

    protected $fillable = [
        'safe_id',
        'user_id',
        'is_primary'
    ];
}
