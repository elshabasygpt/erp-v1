<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (DB::connection()->getDriverName() === 'sqlite') {
            // SQLite does not properly support complex table rebuilds for ->change()
            return;
        }

        $tablesInfo = Schema::getTables();
        $tables = array_map(function($table) { return $table['name']; }, $tablesInfo);

        $excludedTables = ['migrations', 'sqlite_sequence'];
        
        // Columns that are decimals but shouldn't be touched
        $excludedColumns = ['latitude', 'longitude', 'vat_rate', 'discount_percent', 'change_percent', 'markup_percentage', 'share_percentage', 'profit_share_percentage'];

        foreach ($tables as $table) {
            if (in_array($table, $excludedTables)) continue;

            $columnsInfo = Schema::getColumns($table);
            $numericColumns = [];

            foreach ($columnsInfo as $col) {
                if (($col['type_name'] === 'numeric' || $col['type_name'] === 'decimal') && !in_array($col['name'], $excludedColumns)) {
                    $numericColumns[] = $col['name'];
                }
            }

            if (!empty($numericColumns)) {
                Schema::table($table, function (Blueprint $tableBlueprint) use ($numericColumns) {
                    foreach ($numericColumns as $col) {
                        // Change precision to 18, 6
                        $tableBlueprint->decimal($col, 18, 6)->change();
                    }
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Reversing would mean going back to 14,2 or 8,2 but we don't track original sizes.
    }
};
