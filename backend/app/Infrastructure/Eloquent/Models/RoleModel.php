<?php

namespace App\Infrastructure\Eloquent\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role as SpatieRole;
use Spatie\Permission\PermissionRegistrar;

class RoleModel extends SpatieRole
{
    use HasUuids;

    protected $connection = 'tenant';

    protected $casts = [
        'meta_attributes' => 'array',
    ];

    public function givePermissionTo(...$permissions)
    {
        $spatiePassThrough = [];

        foreach (collect($permissions)->flatten() as $permission) {
            if ($permission instanceof PermissionModel) {
                // Direct insert bypasses Spatie's contract instanceof check
                DB::connection('tenant')->table('role_permissions')->insertOrIgnore([
                    'role_id'       => $this->id,
                    'permission_id' => $permission->id,
                ]);
                // Flush Spatie's permission cache so hasPermissionTo() reflects the change
                app(PermissionRegistrar::class)->forgetCachedPermissions();
            } else {
                $spatiePassThrough[] = $permission;
            }
        }

        if (!empty($spatiePassThrough)) {
            parent::givePermissionTo(...$spatiePassThrough);
        }

        return $this;
    }
}
