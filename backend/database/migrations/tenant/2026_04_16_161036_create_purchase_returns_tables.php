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
        Schema::connection('tenant')->create('purchase_returns', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('number')->unique();
            $table->uuid('purchase_invoice_id')->nullable(); // Optional, could be an unassigned return
            $table->uuid('supplier_id');
            $table->date('issue_date');
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->decimal('tax_amount', 12, 2)->default(0);
            $table->string('status')->default('draft'); // draft, completed, cancelled
            $table->text('notes')->nullable();
            
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('purchase_invoice_id')->references('id')->on('purchase_invoices')->onDelete('set null');
            $table->foreign('supplier_id')->references('id')->on('suppliers')->onDelete('cascade');
        });

        Schema::connection('tenant')->create('purchase_return_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('purchase_return_id');
            $table->uuid('product_id');
            $table->decimal('quantity', 10, 3);
            $table->decimal('unit_price', 12, 2);
            $table->decimal('tax_rate', 5, 2)->default(0);
            $table->decimal('tax_amount', 12, 2)->default(0);
            $table->decimal('total', 12, 2); // Qty * Unit Price + Tax

            $table->timestamps();
            $table->softDeletes();

            $table->foreign('purchase_return_id')->references('id')->on('purchase_returns')->onDelete('cascade');
            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('purchase_return_items');
        Schema::connection('tenant')->dropIfExists('purchase_returns');
    }
};
