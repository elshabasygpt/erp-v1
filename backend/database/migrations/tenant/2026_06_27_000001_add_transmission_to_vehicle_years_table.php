<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->table('vehicle_years', function (Blueprint $table) {
            $table->string('transmission', 30)->nullable()->after('fuel_type')
                ->comment('manual | automatic | cvt | semi_automatic');
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->table('vehicle_years', function (Blueprint $table) {
            $table->dropColumn('transmission');
        });
    }
};
