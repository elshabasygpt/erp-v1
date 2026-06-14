<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Stock Transfers
        Schema::connection('tenant')->create('stock_transfers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('reference_number')->unique();
            $table->uuid('from_warehouse_id');
            $table->uuid('to_warehouse_id');
            $table->enum('status', ['draft', 'approved', 'in_transit', 'received', 'cancelled'])->default('draft');
            $table->text('notes')->nullable();
            
            $table->uuid('created_by')->nullable();
            $table->uuid('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->uuid('received_by')->nullable();
            $table->timestamp('received_at')->nullable();
            
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('from_warehouse_id')->references('id')->on('warehouses')->onDelete('cascade');
            $table->foreign('to_warehouse_id')->references('id')->on('warehouses')->onDelete('cascade');
            $table->index(['from_warehouse_id', 'to_warehouse_id']);
            $table->index('status');
        });

        // Stock Transfer Items
        Schema::connection('tenant')->create('stock_transfer_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('stock_transfer_id');
            $table->uuid('product_id');
            $table->decimal('quantity', 12, 2);
            $table->decimal('received_quantity', 12, 2)->default(0);
            
            $table->timestamps();

            $table->foreign('stock_transfer_id')->references('id')->on('stock_transfers')->onDelete('cascade');
            $table->foreign('product_id')->references('id')->on('products')->onDelete('restrict');
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('stock_transfer_items');
        Schema::connection('tenant')->dropIfExists('stock_transfers');
    }
};
