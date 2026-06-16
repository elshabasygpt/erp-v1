<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->create('warranties', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable();
            $table->string('warranty_number')->unique();
            $table->uuid('invoice_id')->nullable();
            $table->uuid('invoice_item_id')->nullable();
            $table->uuid('product_id');
            $table->uuid('customer_id');
            $table->decimal('quantity', 12, 2);
            $table->date('sale_date');
            $table->unsignedSmallInteger('warranty_months');
            $table->date('expiry_date');
            $table->enum('status', ['active', 'expired', 'claimed', 'void'])->default('active');
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('invoice_id')->references('id')->on('invoices')->onDelete('set null');
            $table->foreign('invoice_item_id')->references('id')->on('invoice_items')->onDelete('set null');
            $table->foreign('product_id')->references('id')->on('products')->onDelete('restrict');
            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('restrict');

            $table->index(['tenant_id', 'customer_id']);
            $table->index(['tenant_id', 'product_id']);
            $table->index(['tenant_id', 'status', 'expiry_date']);
            $table->index(['tenant_id', 'invoice_id']);
        });

        Schema::connection('tenant')->create('warranty_claims', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable();
            $table->string('claim_number')->unique();
            $table->uuid('warranty_id');
            $table->date('claim_date');
            $table->enum('claim_type', ['replacement', 'repair', 'refund']);
            $table->text('complaint');
            $table->text('resolution')->nullable();
            $table->uuid('replacement_invoice_id')->nullable();
            $table->enum('status', ['open', 'in_progress', 'resolved', 'rejected'])->default('open');
            $table->timestamp('resolved_at')->nullable();
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('warranty_id')->references('id')->on('warranties')->onDelete('cascade');
            $table->foreign('replacement_invoice_id')->references('id')->on('invoices')->onDelete('set null');

            $table->index(['tenant_id', 'warranty_id']);
            $table->index(['tenant_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('warranty_claims');
        Schema::connection('tenant')->dropIfExists('warranties');
    }
};
