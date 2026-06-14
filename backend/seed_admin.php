<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Ramsey\Uuid\Uuid;

// 1. Create Tenant if not exists
$tenantId = DB::connection('pgsql')->table('tenants')->first()?->id;
if (!$tenantId) {
    $tenantId = Uuid::uuid4()->toString();
    DB::connection('pgsql')->table('tenants')->insert([
        'id' => $tenantId, 'name' => 'Default Tenant', 'domain' => 'default', 'status' => 'active',
        'database_name' => 'saas_accounting_central', 'created_at' => now(), 'updated_at' => now()
    ]);
}

// 2. Create Admin user in tenant database (since AuthController might use it)
$userId = DB::connection('tenant')->table('users')->where('email', 'admin@company.com')->first()?->id;
if (!$userId) {
    $userId = Uuid::uuid4()->toString();
    DB::connection('tenant')->table('users')->insert([
        'id' => $userId, 'name' => 'Admin User', 'email' => 'admin@company.com',
        'password' => Hash::make('password'), 'created_at' => now(), 'updated_at' => now()
    ]);
}

// 3. Central Tenant_Users sync
$exists = DB::connection('pgsql')->table('tenant_users')->where('email', 'admin@company.com')->exists();
if (!$exists) {
    DB::connection('pgsql')->table('tenant_users')->insert([
        'id' => Uuid::uuid4()->toString(),
        'tenant_id' => $tenantId, 'email' => 'admin@company.com',
        'password' => Hash::make('password'), 'is_owner' => true,
        'created_at' => now(), 'updated_at' => now()
    ]);
}

echo "Admin user created/synced successfully!\n";
