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
            $table->index(['status', 'invoice_date']);
            $table->index('salesperson_id');
            $table->index('branch_id');
        });

        Schema::table('invoice_items', function (Blueprint $table) {
            $table->index('product_id');
            $table->index('invoice_id');
        });

        Schema::table('sales_returns', function (Blueprint $table) {
            $table->index(['status', 'return_date']);
            $table->index('reason');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropIndex(['status', 'invoice_date']);
            $table->dropIndex(['salesperson_id']);
            $table->dropIndex(['branch_id']);
        });

        Schema::table('invoice_items', function (Blueprint $table) {
            $table->dropIndex(['product_id']);
            $table->dropIndex(['invoice_id']);
        });

        Schema::table('sales_returns', function (Blueprint $table) {
            $table->dropIndex(['status', 'return_date']);
            $table->dropIndex(['reason']);
        });
    }
};
