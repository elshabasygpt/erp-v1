<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Return reason categories — shown as a comment for reference.
     * defective_manufacturing | defective_installation | wrong_part_ordered
     * wrong_part_shipped | customer_changed_mind | warranty_claim
     * core_deposit_return | shipping_damage | other
     */
    public function up(): void
    {
        Schema::connection('tenant')->create('rma_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();

            // RMA-2026-00001 — unique within this tenant's database
            $table->string('rma_number', 30)->unique();

            $table->uuid('customer_id')->index();
            $table->uuid('invoice_id')->nullable()->index();

            // sales_return | core_return
            $table->string('return_type', 20)->default('sales_return');

            // Structured reason (not free-text)
            $table->string('reason_category', 40);
            $table->text('reason_details')->nullable();

            // submitted → under_review → approved | rejected → fulfilled | cancelled
            $table->string('status', 20)->default('submitted');

            $table->text('rejection_reason')->nullable();
            $table->uuid('reviewed_by')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('fulfilled_at')->nullable();

            // Which SalesReturn or CustomerCoreReturn was created from this RMA
            $table->string('fulfilled_reference_type', 40)->nullable(); // sales_return | customer_core_return
            $table->uuid('fulfilled_reference_id')->nullable();

            // RMA authorization expires after this date (NULL = no expiry)
            $table->timestamp('expires_at')->nullable();

            $table->decimal('expected_refund_value', 15, 2)->nullable();
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::connection('tenant')->create('rma_request_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('rma_request_id')->index();
            $table->uuid('product_id')->index();
            $table->decimal('quantity', 15, 2);
            $table->text('reason_note')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('rma_request_id')
                ->references('id')
                ->on('rma_requests')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('rma_request_items');
        Schema::connection('tenant')->dropIfExists('rma_requests');
    }
};
