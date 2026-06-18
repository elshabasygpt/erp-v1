<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Ramsey\Uuid\Uuid;

class SettingsSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            ['key' => 'company_name', 'value' => 'SaaS Company Demo'],
            ['key' => 'company_address', 'value' => 'Riyadh, Saudi Arabia'],
            ['key' => 'company_phone', 'value' => '0500000000'],
            ['key' => 'vat_number', 'value' => '300000000000003'],
            ['key' => 'cr_number', 'value' => '1010000000'],
            ['key' => 'zatca_environment', 'value' => 'sandbox'],
        ];

        foreach ($settings as $setting) {
            DB::connection('tenant')->table('tenant_settings')->updateOrInsert(
                ['key' => $setting['key']],
                ['id' => Uuid::uuid4()->toString(), 'value' => $setting['value'], 'created_at' => now(), 'updated_at' => now()]
            );
        }

        $this->command->info('✅ Default settings & ZATCA config seeded');
    }
}
