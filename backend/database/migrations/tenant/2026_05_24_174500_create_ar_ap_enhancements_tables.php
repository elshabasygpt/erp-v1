<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Credit Notes (Sales Returns / Adjustments)
        Schema::connection('tenant')->create('credit_notes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('credit_note_number')->unique();
            $table->uuid('customer_id')->nullable();
            $table->uuid('supplier_id')->nullable();
            $table->enum('type', ['customer', 'supplier']);
            $table->uuid('invoice_id')->nullable(); // Original invoice if applicable
            $table->uuid('purchase_invoice_id')->nullable();
            $table->date('issue_date');
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('vat_amount', 15, 2)->default(0);
            $table->decimal('total', 15, 2)->default(0);
            $table->enum('status', ['draft', 'applied', 'refunded'])->default('draft');
            $table->text('reason')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // Supplier Payment Allocations
        Schema::connection('tenant')->create('supplier_payment_allocations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('supplier_payment_id');
            $table->uuid('purchase_invoice_id');
            $table->decimal('amount', 15, 2);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('supplier_payment_id', 'fk_spa_payment_id')->references('id')->on('supplier_payments')->onDelete('cascade');
            $table->foreign('purchase_invoice_id', 'fk_spa_invoice_id')->references('id')->on('purchase_invoices')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('supplier_payment_allocations');
        Schema::connection('tenant')->dropIfExists('credit_notes');
    }
};
