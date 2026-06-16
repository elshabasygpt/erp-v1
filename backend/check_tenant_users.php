<?php
$users = \Illuminate\Support\Facades\DB::connection('pgsql')->table('tenant_users')->get();
echo "tenant_users count: " . $users->count() . "\n";
foreach($users as $u) {
    echo $u->email . " -> tenant: " . $u->tenant_id . "\n";
}

if ($users->count() === 0) {
    $user = \App\Infrastructure\Eloquent\Models\UserModel::first();
    $tenant = \App\Infrastructure\Eloquent\Models\TenantModel::first();
    if ($user && $tenant) {
        \Illuminate\Support\Facades\DB::connection('pgsql')
            ->table('tenant_users')
            ->insertOrIgnore([
                'id'        => (string) \Illuminate\Support\Str::uuid(),
                'email'     => $user->email,
                'tenant_id' => $tenant->id,
                'created_at'=> now(),
                'updated_at'=> now(),
            ]);
        echo "Done: " . $user->email . " linked to tenant " . $tenant->id . "\n";
    } else {
        echo "User or Tenant not found!\n";
    }
}
