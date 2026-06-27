<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->table('warehouse_products', function (Blueprint $table) {
            $table->uuid('bin_location_id')->nullable()->after('bin_location');
            $table->foreign('bin_location_id')
                ->references('id')->on('warehouse_bin_locations')
                ->nullOnDelete();
            $table->index('bin_location_id');
        });

        Schema::connection('tenant')->table('stock_lots', function (Blueprint $table) {
            $table->uuid('bin_location_id')->nullable()->after('quantity');
            $table->foreign('bin_location_id')
                ->references('id')->on('warehouse_bin_locations')
                ->nullOnDelete();
            $table->index('bin_location_id');
        });

        Schema::connection('tenant')->table('inventory_stocktake_items', function (Blueprint $table) {
            $table->uuid('bin_location_id')->nullable()->after('bin_location');
            $table->foreign('bin_location_id')
                ->references('id')->on('warehouse_bin_locations')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->table('warehouse_products', function (Blueprint $table) {
            $table->dropForeign(['bin_location_id']);
            $table->dropIndex(['bin_location_id']);
            $table->dropColumn('bin_location_id');
        });

        Schema::connection('tenant')->table('stock_lots', function (Blueprint $table) {
            $table->dropForeign(['bin_location_id']);
            $table->dropIndex(['bin_location_id']);
            $table->dropColumn('bin_location_id');
        });

        Schema::connection('tenant')->table('inventory_stocktake_items', function (Blueprint $table) {
            $table->dropForeign(['bin_location_id']);
            $table->dropColumn('bin_location_id');
        });
    }
};
