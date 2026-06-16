<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::connection('tenant')->table('vehicle_models', function (Blueprint $table) {
            $table->string('image_url')->nullable()->after('body_type');
        });

        Schema::connection('tenant')->table('vehicle_years', function (Blueprint $table) {
            $table->string('engine_image_url')->nullable()->after('fuel_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('tenant')->table('vehicle_models', function (Blueprint $table) {
            $table->dropColumn('image_url');
        });

        Schema::connection('tenant')->table('vehicle_years', function (Blueprint $table) {
            $table->dropColumn('engine_image_url');
        });
    }
};
