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
        Schema::connection('tenant')->create('inventory_adjustments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('reference_number')->unique();
            $table->uuid('warehouse_id');
            $table->date('date');
            $table->enum('type', ['spoilage', 'reconciliation']);
            $table->text('notes')->nullable();
            $table->string('status')->default('completed'); // could be pending if drafted
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('warehouse_id')->references('id')->on('warehouses')->onDelete('cascade');
        });

        Schema::connection('tenant')->create('inventory_adjustment_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('inventory_adjustment_id');
            $table->uuid('product_id');
            $table->decimal('expected_quantity', 12, 3)->default(0);
            $table->decimal('actual_quantity', 12, 3);
            $table->decimal('difference', 12, 3); // actual - expected
            $table->decimal('unit_cost', 12, 2)->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('inventory_adjustment_id')->references('id')->on('inventory_adjustments')->onDelete('cascade');
            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('inventory_adjustment_items');
        Schema::connection('tenant')->dropIfExists('inventory_adjustments');
    }
};
