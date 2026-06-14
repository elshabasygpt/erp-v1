<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Purchase Invoices
        Schema::connection('tenant')->create('purchase_invoices', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('invoice_number')->unique();
            $table->uuid('supplier_id');
            $table->decimal('subtotal', 14, 2)->default(0);
            $table->decimal('vat_amount', 14, 2)->default(0);
            $table->decimal('total', 14, 2)->default(0);
            $table->enum('status', ['draft', 'confirmed', 'cancelled'])->default('draft');
            $table->text('notes')->nullable();
            $table->uuid('warehouse_id')->nullable();
            $table->timestamp('invoice_date')->useCurrent();
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('supplier_id')->references('id')->on('suppliers')->onDelete('restrict');
            $table->foreign('warehouse_id')->references('id')->on('warehouses')->onDelete('set null');
            $table->index('status');
        });

        // Purchase Invoice Items
        Schema::connection('tenant')->create('purchase_invoice_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('purchase_invoice_id');
            $table->uuid('product_id');
            $table->decimal('quantity', 12, 2);
            $table->decimal('unit_price', 12, 2);
            $table->decimal('vat_rate', 5, 2)->default(15);
            $table->decimal('total', 14, 2)->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('purchase_invoice_id')->references('id')->on('purchase_invoices')->onDelete('cascade');
            $table->foreign('product_id')->references('id')->on('products')->onDelete('restrict');
        });

        // Supplier Payments
        Schema::connection('tenant')->create('supplier_payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('supplier_id');
            $table->uuid('purchase_invoice_id')->nullable();
            $table->decimal('amount', 14, 2);
            $table->enum('payment_method', ['cash', 'bank_transfer', 'check']);
            $table->string('reference')->nullable();
            $table->text('notes')->nullable();
            $table->date('payment_date');
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('supplier_id')->references('id')->on('suppliers')->onDelete('restrict');
            $table->foreign('purchase_invoice_id')->references('id')->on('purchase_invoices')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('supplier_payments');
        Schema::connection('tenant')->dropIfExists('purchase_invoice_items');
        Schema::connection('tenant')->dropIfExists('purchase_invoices');
    }
};
