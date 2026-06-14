<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->create('stock_ledgers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('product_id');
            $table->uuid('warehouse_id');
            $table->date('transaction_date');
            $table->enum('transaction_type', ['purchase', 'sale', 'transfer', 'adjustment', 'return']);
            $table->uuid('reference_id')->nullable(); // Invoice ID, Purchase ID, etc.
            $table->decimal('quantity_change', 15, 4); // positive for in, negative for out
            $table->decimal('unit_cost', 15, 4); // The cost per unit for this specific movement
            $table->decimal('total_cost', 15, 4); // quantity_change * unit_cost
            $table->decimal('balance_quantity', 15, 4); // Running total quantity
            $table->decimal('balance_value', 15, 4); // Running total value
            $table->decimal('average_cost', 15, 4); // Moving average cost after this transaction
            $table->uuid('created_by')->nullable();
            $table->timestamps();

            $table->index(['product_id', 'warehouse_id', 'transaction_date'], 'idx_stock_ledger_search');
            $table->index(['reference_id']);
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('stock_ledgers');
    }
};
