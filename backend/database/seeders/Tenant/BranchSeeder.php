<?php

namespace Database\Seeders\Tenant;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BranchSeeder extends Seeder
{
    public function run(): void
    {
        $branchId = Str::uuid()->toString();

        // 1. Create Main Branch
        DB::connection('tenant')->table('branches')->insert([
            'id' => $branchId,
            'name' => 'Main Branch',
            'name_ar' => 'الفرع الرئيسي',
            'location' => 'Headquarters',
            'is_default' => true,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 2. Assign everything without a branch to this Main Branch
        DB::connection('tenant')->table('users')
            ->whereNull('branch_id')
            ->update(['branch_id' => $branchId]);

        DB::connection('tenant')->table('warehouses')
            ->whereNull('branch_id')
            ->update(['branch_id' => $branchId]);

        DB::connection('tenant')->table('invoices')
            ->whereNull('branch_id')
            ->update(['branch_id' => $branchId]);
    }
}
