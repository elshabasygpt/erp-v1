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
        Schema::table('users', function (Blueprint $table) {
            $table->decimal('commission_rate', 5, 2)->default(0.00)->after('is_active');
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->decimal('commission_amount', 12, 2)->default(0.00)->after('total');
        });

        Schema::table('invoice_items', function (Blueprint $table) {
            $table->decimal('cost_price', 12, 2)->default(0.00)->after('unit_price');
        });

        Schema::table('sales_returns', function (Blueprint $table) {
            $table->decimal('commission_amount', 12, 2)->default(0.00)->after('total');
        });

        Schema::table('sales_return_items', function (Blueprint $table) {
            $table->decimal('cost_price', 12, 2)->default(0.00)->after('unit_price');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('commission_rate');
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn('commission_amount');
        });

        Schema::table('sales_returns', function (Blueprint $table) {
            $table->dropColumn('commission_amount');
        });
    }
};
