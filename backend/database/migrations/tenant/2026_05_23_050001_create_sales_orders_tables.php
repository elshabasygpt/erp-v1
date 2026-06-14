<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->create('sales_orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('so_number')->unique();
            $table->uuid('quotation_id')->nullable();
            $table->uuid('customer_id');
            $table->uuid('warehouse_id');
            $table->timestamp('issue_date')->useCurrent();
            $table->timestamp('delivery_date')->nullable();
            
            $table->decimal('subtotal', 14, 2)->default(0);
            $table->decimal('vat_amount', 14, 2)->default(0);
            $table->decimal('total', 14, 2)->default(0);
            
            $table->enum('status', ['draft', 'approved', 'partially_fulfilled', 'fulfilled', 'cancelled'])->default('draft');
            $table->text('notes')->nullable();
            
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('quotation_id')->references('id')->on('quotations')->onDelete('set null');
            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('restrict');
            $table->foreign('warehouse_id')->references('id')->on('warehouses')->onDelete('restrict');
        });

        Schema::connection('tenant')->create('sales_order_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('sales_order_id');
            $table->uuid('product_id');
            $table->decimal('quantity', 12, 2);
            $table->decimal('fulfilled_quantity', 12, 2)->default(0);
            $table->decimal('unit_price', 12, 2);
            $table->decimal('vat_rate', 5, 2)->default(15);
            $table->decimal('total', 14, 2)->default(0);
            
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('sales_order_id')->references('id')->on('sales_orders')->onDelete('cascade');
            $table->foreign('product_id')->references('id')->on('products')->onDelete('restrict');
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('sales_order_items');
        Schema::connection('tenant')->dropIfExists('sales_orders');
    }
};
