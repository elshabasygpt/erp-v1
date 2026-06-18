<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->create('inventory_stocktakes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('reference_number')->unique();
            $table->uuid('warehouse_id');
            $table->uuid('category_id')->nullable(); // Optional: limit count to specific category
            $table->enum('status', ['draft', 'counting', 'review', 'completed', 'cancelled'])->default('draft');
            $table->uuid('assigned_to')->nullable(); // User ID counting
            $table->date('scheduled_date');
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('warehouse_id')->references('id')->on('warehouses')->onDelete('cascade');
            $table->foreign('category_id')->references('id')->on('inventory_categories')->nullOnDelete();
        });

        Schema::connection('tenant')->create('inventory_stocktake_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('stocktake_id');
            $table->uuid('product_id');
            $table->string('bin_location')->nullable(); // If using bins
            $table->decimal('expected_quantity', 12, 3)->default(0); // snapshot
            $table->decimal('counted_quantity', 12, 3)->nullable(); // null means not counted yet
            $table->decimal('difference', 12, 3)->default(0); // counted - expected
            $table->decimal('unit_cost', 12, 2)->default(0); // snapshot cost
            $table->decimal('variance_value', 14, 2)->default(0); // difference * unit_cost
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('stocktake_id')->references('id')->on('inventory_stocktakes')->onDelete('cascade');
            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
            
            $table->unique(['stocktake_id', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('inventory_stocktake_items');
        Schema::connection('tenant')->dropIfExists('inventory_stocktakes');
    }
};
