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
        Schema::table('invoices', function (Blueprint $table) {
            $table->index(['tenant_id', 'status'], 'idx_invoices_tenant_status');
            $table->index(['tenant_id', 'created_at'], 'idx_invoices_tenant_created');
            $table->index(['tenant_id', 'customer_id'], 'idx_invoices_tenant_customer');
            $table->index(['tenant_id', 'invoice_date'], 'idx_invoices_tenant_date');
        });

        Schema::table('purchase_invoices', function (Blueprint $table) {
            $table->index(['tenant_id', 'status'], 'idx_purchases_tenant_status');
            $table->index(['tenant_id', 'created_at'], 'idx_purchases_tenant_created');
            $table->index(['tenant_id', 'supplier_id'], 'idx_purchases_tenant_supplier');
            $table->index(['tenant_id', 'purchase_date'], 'idx_purchases_tenant_date');
        });

        Schema::table('journal_entries', function (Blueprint $table) {
            $table->index(['tenant_id', 'is_posted'], 'idx_je_tenant_posted');
            $table->index(['tenant_id', 'date'], 'idx_je_tenant_date');
        });

        Schema::table('warehouse_products', function (Blueprint $table) {
            $table->index(['tenant_id', 'warehouse_id'], 'idx_wp_tenant_warehouse');
            $table->index(['tenant_id', 'product_id'], 'idx_wp_tenant_product');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('warehouse_products', function (Blueprint $table) {
            $table->dropIndex('idx_wp_tenant_warehouse');
            $table->dropIndex('idx_wp_tenant_product');
        });

        Schema::table('journal_entries', function (Blueprint $table) {
            $table->dropIndex('idx_je_tenant_posted');
            $table->dropIndex('idx_je_tenant_date');
        });

        Schema::table('purchase_invoices', function (Blueprint $table) {
            $table->dropIndex('idx_purchases_tenant_status');
            $table->dropIndex('idx_purchases_tenant_created');
            $table->dropIndex('idx_purchases_tenant_supplier');
            $table->dropIndex('idx_purchases_tenant_date');
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->dropIndex('idx_invoices_tenant_status');
            $table->dropIndex('idx_invoices_tenant_created');
            $table->dropIndex('idx_invoices_tenant_customer');
            $table->dropIndex('idx_invoices_tenant_date');
        });
    }
};
