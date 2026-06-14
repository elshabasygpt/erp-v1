<?php

declare(strict_types=1);

namespace App\Infrastructure\Eloquent\Models;

class PermissionModel extends BaseModel
{
    protected $table = 'permissions';

    protected $fillable = ['name', 'guard_name'];

    public function roles()
    {
        return $this->belongsToMany(RoleModel::class, 'role_permissions', 'permission_id', 'role_id');
    }
}
