<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // -------------------------------------------------------------
        // SALES RETURNS
        // -------------------------------------------------------------
        Schema::connection('tenant')->create('sales_returns', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('return_number')->unique();
            $table->uuid('invoice_id')->nullable();
            $table->uuid('customer_id');
            $table->uuid('warehouse_id');
            $table->timestamp('return_date')->useCurrent();
            $table->decimal('subtotal', 14, 2)->default(0);
            $table->decimal('vat_amount', 14, 2)->default(0);
            $table->decimal('total', 14, 2)->default(0);
            $table->enum('status', ['draft', 'completed', 'cancelled'])->default('draft');
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('invoice_id')->references('id')->on('invoices')->onDelete('set null');
            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('restrict');
            $table->foreign('warehouse_id')->references('id')->on('warehouses')->onDelete('restrict');
        });

        Schema::connection('tenant')->create('sales_return_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('sales_return_id');
            $table->uuid('product_id');
            $table->decimal('quantity', 12, 2);
            $table->decimal('unit_price', 12, 2);
            $table->decimal('vat_rate', 5, 2)->default(15);
            $table->decimal('total', 14, 2)->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('sales_return_id')->references('id')->on('sales_returns')->onDelete('cascade');
            $table->foreign('product_id')->references('id')->on('products')->onDelete('restrict');
        });

        // -------------------------------------------------------------
        // QUOTATIONS
        // -------------------------------------------------------------
        Schema::connection('tenant')->create('quotations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('quotation_number')->unique();
            $table->uuid('customer_id');
            $table->timestamp('issue_date')->useCurrent();
            $table->timestamp('expiry_date')->nullable();
            $table->decimal('subtotal', 14, 2)->default(0);
            $table->decimal('vat_amount', 14, 2)->default(0);
            $table->decimal('total', 14, 2)->default(0);
            $table->enum('status', ['draft', 'sent', 'accepted', 'rejected', 'expired'])->default('draft');
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('restrict');
        });

        Schema::connection('tenant')->create('quotation_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('quotation_id');
            $table->uuid('product_id');
            $table->decimal('quantity', 12, 2);
            $table->decimal('unit_price', 12, 2);
            $table->decimal('vat_rate', 5, 2)->default(15);
            $table->decimal('total', 14, 2)->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('quotation_id')->references('id')->on('quotations')->onDelete('cascade');
            $table->foreign('product_id')->references('id')->on('products')->onDelete('restrict');
        });

        // -------------------------------------------------------------
        // SHIPPING INVOICES
        // -------------------------------------------------------------
        Schema::connection('tenant')->create('shipping_invoices', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('shipping_number')->unique();
            $table->uuid('invoice_id'); // Tied to the main Sales Invoice
            $table->string('carrier')->nullable();
            $table->string('tracking_number')->nullable();
            $table->decimal('shipping_cost', 14, 2)->default(0);
            $table->enum('status', ['pending', 'shipped', 'delivered', 'returned', 'cancelled'])->default('pending');
            $table->timestamp('shipped_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->text('shipping_address')->nullable();
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('invoice_id')->references('id')->on('invoices')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('shipping_invoices');
        Schema::connection('tenant')->dropIfExists('quotation_items');
        Schema::connection('tenant')->dropIfExists('quotations');
        Schema::connection('tenant')->dropIfExists('sales_return_items');
        Schema::connection('tenant')->dropIfExists('sales_returns');
    }
};
