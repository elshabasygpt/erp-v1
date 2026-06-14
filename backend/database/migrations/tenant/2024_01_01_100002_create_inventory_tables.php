<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Warehouses
        Schema::connection('tenant')->create('warehouses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('location')->nullable();
            $table->boolean('is_default')->default(false);
            $table->boolean('is_active')->default(true);
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // Products
        Schema::connection('tenant')->create('products', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('name_ar');
            $table->string('sku')->unique();
            $table->string('barcode')->nullable()->index();
            $table->decimal('cost_price', 12, 2)->default(0);
            $table->decimal('sell_price', 12, 2)->default(0);
            $table->decimal('vat_rate', 5, 2)->default(15);
            $table->integer('stock_alert_level')->default(10);
            $table->boolean('is_active')->default(true);
            $table->uuid('category_id')->nullable();
            $table->string('unit_of_measure', 50)->default('piece');
            $table->text('description')->nullable();
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('name');
            $table->index('is_active');
        });

        // Warehouse Products (stock levels per warehouse)
        Schema::connection('tenant')->create('warehouse_products', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('warehouse_id');
            $table->uuid('product_id');
            $table->decimal('quantity', 12, 2)->default(0);
            $table->decimal('average_cost', 12, 2)->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('warehouse_id')->references('id')->on('warehouses')->onDelete('cascade');
            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
            $table->unique(['warehouse_id', 'product_id']);
        });

        // Stock Movements
        Schema::connection('tenant')->create('stock_movements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('product_id');
            $table->uuid('warehouse_id');
            $table->enum('type', ['in', 'out', 'transfer', 'adjustment']);
            $table->decimal('quantity', 12, 2);
            $table->decimal('cost_per_unit', 12, 2)->default(0);
            $table->string('reference_type')->nullable(); // invoice, purchase, adjustment
            $table->uuid('reference_id')->nullable();
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
            $table->foreign('warehouse_id')->references('id')->on('warehouses')->onDelete('cascade');
            $table->index(['product_id', 'warehouse_id']);
            $table->index(['reference_type', 'reference_id']);
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('stock_movements');
        Schema::connection('tenant')->dropIfExists('warehouse_products');
        Schema::connection('tenant')->dropIfExists('products');
        Schema::connection('tenant')->dropIfExists('warehouses');
    }
};
