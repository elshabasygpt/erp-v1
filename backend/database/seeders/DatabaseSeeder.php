<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Ramsey\Uuid\Uuid;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->command->info('Starting full database seed...');

        // Create Default Tenant
        $tenantId = '00000000-0000-0000-0000-000000000001';
        $this->command->info('Creating default tenant...');
        
        // Disable foreign key checks for clean seeding if necessary (Postgres uses different syntax, but we are just inserting)
        
        DB::connection('pgsql')->table('tenants')->insertOrIgnore([
            'id' => $tenantId,
            'name' => 'Default Company',
            'domain' => 'default.localhost',
            'database_name' => 'saas_accounting_central',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Run Admin Seeder
        $this->command->info('Running AdminSeeder...');
        $this->call(AdminSeeder::class);

        // Run Demo Data Seeder
        $this->command->info('Running DemoDataSeeder...');
        $this->call(DemoDataSeeder::class);

        // Run Vehicle Data Seeder
        $this->command->info('Running VehicleDataSeeder...');
        $this->call(VehicleDataSeeder::class);

        // Link Admin User to Default Tenant
        $this->command->info('Linking Admin User to Default Tenant...');
        $adminEmail = 'admin@company.com';
        
        // Assuming admin was created by AdminSeeder with this email
        DB::connection('pgsql')->table('tenant_users')->insertOrIgnore([
            'id' => Uuid::uuid4()->toString(),
            'email' => $adminEmail,
            'password' => \Illuminate\Support\Facades\Hash::make('password'),
            'is_owner' => true,
            'tenant_id' => $tenantId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->command->info('Database seeding completed successfully!');
    }
}
