<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

use Laravel\Sanctum\PersonalAccessToken as SanctumToken;

class TenantPersonalAccessToken extends SanctumToken
{
    protected $connection = 'tenant';

    protected $table = 'personal_access_tokens';
}
