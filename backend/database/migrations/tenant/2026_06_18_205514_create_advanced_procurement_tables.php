<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Purchase Requests
        Schema::connection('tenant')->create('purchase_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('request_number')->unique();
            $table->string('department')->nullable();
            $table->uuid('cost_center_id')->nullable();
            $table->enum('status', ['draft', 'pending_approval', 'approved', 'rejected', 'completed'])->default('draft');
            $table->date('required_date')->nullable();
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->uuid('approved_by')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // Purchase Request Items
        Schema::connection('tenant')->create('purchase_request_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('purchase_request_id');
            $table->uuid('product_id')->nullable(); // nullable if they request an unknown item
            $table->string('description')->nullable();
            $table->decimal('quantity', 12, 2);
            $table->uuid('unit_id')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('purchase_request_id')->references('id')->on('purchase_requests')->onDelete('cascade');
        });

        // Requests for Quotation (RFQ)
        Schema::connection('tenant')->create('rfqs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('rfq_number')->unique();
            $table->uuid('purchase_request_id')->nullable();
            $table->enum('status', ['draft', 'sent', 'closed', 'awarded'])->default('draft');
            $table->date('deadline_date')->nullable();
            $table->text('terms_and_conditions')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('purchase_request_id')->references('id')->on('purchase_requests')->onDelete('set null');
        });

        // RFQ Items
        Schema::connection('tenant')->create('rfq_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('rfq_id');
            $table->uuid('product_id')->nullable();
            $table->string('description')->nullable();
            $table->decimal('quantity', 12, 2);
            $table->uuid('unit_id')->nullable();
            $table->timestamps();

            $table->foreign('rfq_id')->references('id')->on('rfqs')->onDelete('cascade');
        });

        // Supplier Quotations
        Schema::connection('tenant')->create('supplier_quotations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('quotation_number')->nullable();
            $table->uuid('rfq_id')->nullable();
            $table->uuid('supplier_id');
            $table->decimal('total_amount', 14, 2)->default(0);
            $table->enum('status', ['pending', 'accepted', 'rejected'])->default('pending');
            $table->text('supplier_notes')->nullable();
            $table->integer('lead_time_days')->nullable();
            $table->date('valid_until')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('rfq_id')->references('id')->on('rfqs')->onDelete('cascade');
            $table->foreign('supplier_id')->references('id')->on('suppliers')->onDelete('restrict');
        });

        // Supplier Quotation Items
        Schema::connection('tenant')->create('supplier_quotation_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('supplier_quotation_id');
            $table->uuid('product_id')->nullable();
            $table->string('description')->nullable();
            $table->decimal('quantity', 12, 2);
            $table->decimal('unit_price', 12, 2)->default(0);
            $table->decimal('total_price', 14, 2)->default(0);
            $table->timestamps();

            $table->foreign('supplier_quotation_id')->references('id')->on('supplier_quotations')->onDelete('cascade');
        });

        // Purchase Orders
        Schema::connection('tenant')->create('purchase_orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('po_number')->unique();
            $table->uuid('supplier_id');
            $table->uuid('supplier_quotation_id')->nullable();
            $table->uuid('purchase_request_id')->nullable();
            $table->decimal('subtotal', 14, 2)->default(0);
            $table->decimal('vat_amount', 14, 2)->default(0);
            $table->decimal('total', 14, 2)->default(0);
            $table->enum('status', ['draft', 'sent', 'confirmed', 'partially_received', 'received', 'cancelled'])->default('draft');
            $table->date('expected_delivery_date')->nullable();
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('supplier_id')->references('id')->on('suppliers')->onDelete('restrict');
            $table->foreign('supplier_quotation_id')->references('id')->on('supplier_quotations')->onDelete('set null');
            $table->foreign('purchase_request_id')->references('id')->on('purchase_requests')->onDelete('set null');
        });

        // Purchase Order Items
        Schema::connection('tenant')->create('purchase_order_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('purchase_order_id');
            $table->uuid('product_id');
            $table->string('description')->nullable();
            $table->decimal('quantity', 12, 2);
            $table->decimal('unit_price', 12, 2);
            $table->decimal('vat_rate', 5, 2)->default(15);
            $table->decimal('vat_amount', 14, 2)->default(0);
            $table->decimal('total', 14, 2)->default(0);
            $table->decimal('received_quantity', 12, 2)->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('purchase_order_id')->references('id')->on('purchase_orders')->onDelete('cascade');
            $table->foreign('product_id')->references('id')->on('products')->onDelete('restrict');
        });

        // Update purchase_invoices to link to PO
        Schema::connection('tenant')->table('purchase_invoices', function (Blueprint $table) {
            $table->uuid('purchase_order_id')->nullable()->after('supplier_id');
            $table->foreign('purchase_order_id')->references('id')->on('purchase_orders')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->table('purchase_invoices', function (Blueprint $table) {
            $table->dropForeign(['purchase_order_id']);
            $table->dropColumn('purchase_order_id');
        });

        Schema::connection('tenant')->dropIfExists('purchase_order_items');
        Schema::connection('tenant')->dropIfExists('purchase_orders');
        Schema::connection('tenant')->dropIfExists('supplier_quotation_items');
        Schema::connection('tenant')->dropIfExists('supplier_quotations');
        Schema::connection('tenant')->dropIfExists('rfq_items');
        Schema::connection('tenant')->dropIfExists('rfqs');
        Schema::connection('tenant')->dropIfExists('purchase_request_items');
        Schema::connection('tenant')->dropIfExists('purchase_requests');
    }
};
