<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

$u = DB::connection('tenant')->table('users')->where('email', 'admin@company.com')->first();
if ($u) {
    $tenantId = '00000000-0000-0000-0000-000000000001';
    DB::connection('pgsql')->table('tenants')->updateOrInsert(
        ['id' => $tenantId],
        ['name' => 'Kimo Store', 'domain' => 'localhost', 'database_name' => DB::connection('tenant')->getDatabaseName(), 'created_at' => now(), 'updated_at' => now()]
    );
    
    DB::connection('pgsql')->table('tenant_users')->updateOrInsert(
        ['email' => 'admin@company.com'],
        ['id' => (string)Str::uuid(), 'tenant_id' => $tenantId, 'password' => $u->password, 'is_owner' => true, 'created_at' => now(), 'updated_at' => now()]
    );
    
    echo "Linked successfully.\n";
} else {
    echo "User not found.\n";
}
