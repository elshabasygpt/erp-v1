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
        // Add High-Performance composite indexes for heavy ERP reporting
        Schema::table('journal_entries', function (Blueprint $table) {
            $table->index(['is_posted', 'date'], 'idx_je_posted_date');
        });

        Schema::table('journal_entry_lines', function (Blueprint $table) {
            $table->index(['account_id', 'journal_entry_id'], 'idx_jel_account_je');
        });

        Schema::table('stock_movements', function (Blueprint $table) {
            $table->index(['warehouse_id', 'product_id', 'created_at'], 'idx_sm_wh_prod_date');
        });

        Schema::table('warehouse_products', function (Blueprint $table) {
            $table->index(['warehouse_id', 'quantity'], 'idx_wp_wh_qty');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // SQLite doesn't cleanly drop indexes inside table blueprint sometimes,
        // but standard Laravel works if the names are correct.
        Schema::table('journal_entries', function (Blueprint $table) {
            $table->dropIndex('idx_je_posted_date');
        });

        Schema::table('journal_entry_lines', function (Blueprint $table) {
            $table->dropIndex('idx_jel_account_je');
        });

        Schema::table('stock_movements', function (Blueprint $table) {
            $table->dropIndex('idx_sm_wh_prod_date');
        });

        Schema::table('warehouse_products', function (Blueprint $table) {
            $table->dropIndex('idx_wp_wh_qty');
        });
    }
};
