<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->create('stock_lots', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('product_id');
            $table->uuid('warehouse_id');
            $table->string('lot_number')->nullable();
            $table->string('serial_number')->nullable();
            $table->date('production_date')->nullable();
            $table->date('expiry_date')->nullable();
            $table->decimal('quantity', 15, 4)->default(0);
            $table->uuid('purchase_invoice_item_id')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['product_id', 'warehouse_id']);
            $table->index(['lot_number']);
            $table->index(['serial_number']);
        });

        // Also add lot/serial tracking to invoice items
        Schema::connection('tenant')->table('invoice_items', function (Blueprint $table) {
            $table->uuid('stock_lot_id')->nullable()->after('product_id');
        });

        Schema::connection('tenant')->table('purchase_invoice_items', function (Blueprint $table) {
            $table->uuid('stock_lot_id')->nullable()->after('product_id');
            $table->string('lot_number')->nullable()->after('stock_lot_id');
            $table->string('serial_number')->nullable()->after('lot_number');
            $table->date('production_date')->nullable()->after('serial_number');
            $table->date('expiry_date')->nullable()->after('production_date');
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->table('purchase_invoice_items', function (Blueprint $table) {
            $table->dropColumn('stock_lot_id');
        });

        Schema::connection('tenant')->table('invoice_items', function (Blueprint $table) {
            $table->dropColumn('stock_lot_id');
        });

        Schema::connection('tenant')->dropIfExists('stock_lots');
    }
};
