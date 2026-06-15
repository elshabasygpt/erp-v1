<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->create('inventory_cost_layers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('product_id');
            $table->uuid('warehouse_id');
            $table->decimal('unit_cost', 15, 4);
            $table->decimal('original_quantity', 15, 4);
            $table->decimal('remaining_quantity', 15, 4);
            $table->string('reference_type')->nullable(); // purchase, adjustment_in, transfer_in, return
            $table->uuid('reference_id')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'product_id', 'warehouse_id']);
            $table->index(['remaining_quantity']);
        });

        Schema::connection('tenant')->create('inventory_cost_layer_consumptions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('layer_id');
            $table->string('transaction_type'); // sale, adjustment_out, transfer_out
            $table->uuid('transaction_id');
            $table->decimal('quantity_consumed', 15, 4);
            $table->decimal('unit_cost', 15, 4);
            $table->uuid('created_by')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'transaction_type', 'transaction_id'], 'idx_layer_consumption_txn');
            $table->foreign('layer_id')->references('id')->on('inventory_cost_layers')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('inventory_cost_layer_consumptions');
        Schema::connection('tenant')->dropIfExists('inventory_cost_layers');
    }
};
