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
        Schema::connection('tenant')->table('warehouse_products', function (Blueprint $table) {
            $table->string('bin_location')->nullable()->after('average_cost');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('tenant')->table('warehouse_products', function (Blueprint $table) {
            $table->dropColumn('bin_location');
        });
    }
};
