<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Seed the required ZATCA settings keys (empty by default)
        $settings = [
            'zatca_environment',    // simulation | developer | production
            'zatca_private_key',    // encrypted
            'zatca_compliance_csid', // encrypted
            'zatca_compliance_secret', // encrypted
            'zatca_certificate',    // encrypted
            'zatca_status',         // pending | compliance_issued | onboarded
            'zatca_onboarded_at',
            'company_name',
            'vat_number',
            'branch_name',
        ];

        foreach ($settings as $key) {
            DB::table('tenant_settings')->insertOrIgnore([
                'id' => Str::uuid(),
                'key' => $key,
                'value' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenant_settings', function (Blueprint $table) {
            //
        });
    }
};
