<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->table('fixed_assets', function (Blueprint $table) {
            $table->string('depreciation_method', 30)->default('straight_line')->after('useful_life_years');
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->table('fixed_assets', function (Blueprint $table) {
            $table->dropColumn('depreciation_method');
        });
    }
};
