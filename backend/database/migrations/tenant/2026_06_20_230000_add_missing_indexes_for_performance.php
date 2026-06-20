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
        $tablesInfo = Schema::getTables();
        $tables = array_map(function($table) { return $table['name']; }, $tablesInfo);
        
        $targetColumns = ['tenant_id', 'branch_id', 'warehouse_id', 'customer_id', 'product_id', 'status', 'created_at'];

        foreach ($tables as $table) {
            if ($table === 'migrations' || $table === 'sqlite_sequence') continue;
            
            $columns = Schema::getColumnListing($table);
            $indexes = Schema::getIndexes($table);
            
            $columnsToIndex = [];
            
            foreach ($targetColumns as $col) {
                if (in_array($col, $columns)) {
                    $hasIndex = false;
                    foreach ($indexes as $index) {
                        if ($index['columns'][0] === $col || in_array($col, $index['columns'])) {
                            $hasIndex = true;
                            break;
                        }
                    }
                    if (!$hasIndex) {
                        $columnsToIndex[] = $col;
                    }
                }
            }
            
            if (!empty($columnsToIndex)) {
                Schema::table($table, function (Blueprint $tableBlueprint) use ($columnsToIndex, $table) {
                    foreach ($columnsToIndex as $col) {
                        // Create a short index name to avoid string too long errors
                        $indexName = substr("idx_{$table}_{$col}", 0, 60);
                        $tableBlueprint->index($col, $indexName);
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
        // Reversing is not strictly necessary for performance indexes.
    }
};
