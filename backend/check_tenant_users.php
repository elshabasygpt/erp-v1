<?php

use App\Infrastructure\Eloquent\Models\TenantModel;
use App\Infrastructure\Eloquent\Models\UserModel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

$users = DB::connection('pgsql')->table('tenant_users')->get();
echo 'tenant_users count: '.$users->count()."\n";
foreach ($users as $u) {
    echo $u->email.' -> tenant: '.$u->tenant_id."\n";
}

if ($users->count() === 0) {
    $user = UserModel::first();
    $tenant = TenantModel::first();
    if ($user && $tenant) {
        DB::connection('pgsql')
            ->table('tenant_users')
            ->insertOrIgnore([
                'id' => (string) Str::uuid(),
                'email' => $user->email,
                'tenant_id' => $tenant->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        echo 'Done: '.$user->email.' linked to tenant '.$tenant->id."\n";
    } else {
        echo "User or Tenant not found!\n";
    }
}
