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
            $table->uuid('sales_channel_id')->nullable()->after('customer_id');
            $table->string('sales_channel_name')->nullable()->after('sales_channel_id');
            $table->string('pricing_adjustment_type')->nullable()->after('sales_channel_name');
            $table->decimal('pricing_adjustment_value', 15, 2)->nullable()->after('pricing_adjustment_type');

            $table->foreign('sales_channel_id')->references('id')->on('sales_channels')->nullOnDelete();
        });

        Schema::table('invoice_items', function (Blueprint $table) {
            $table->decimal('base_unit_price', 15, 2)->nullable()->after('unit_price');
            $table->decimal('adjusted_unit_price', 15, 2)->nullable()->after('base_unit_price');
            $table->decimal('adjustment_amount', 15, 2)->default(0)->after('adjusted_unit_price');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropForeign(['sales_channel_id']);
            $table->dropColumn([
                'sales_channel_id',
                'sales_channel_name',
                'pricing_adjustment_type',
                'pricing_adjustment_value',
            ]);
        });

        Schema::table('invoice_items', function (Blueprint $table) {
            $table->dropColumn([
                'base_unit_price',
                'adjusted_unit_price',
                'adjustment_amount',
            ]);
        });
    }
};
