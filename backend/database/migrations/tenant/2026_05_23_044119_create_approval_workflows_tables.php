<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->create('approval_rules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('entity_type'); // invoice, return, etc.
            $table->string('trigger_type'); // high_discount, negative_margin, credit_limit_exceeded, manual_price_override, refund, exchange, cancellation
            $table->decimal('threshold', 12, 2)->nullable();
            $table->string('required_role')->default('manager');
            $table->boolean('is_active')->default(true);
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::connection('tenant')->create('approval_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('entity_type');
            $table->uuid('entity_id');
            $table->string('trigger_type');
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->uuid('requested_by');
            $table->uuid('resolved_by')->nullable();
            $table->text('notes')->nullable();
            $table->json('payload')->nullable(); // To store the original DTO or contextual data needed to resume
            $table->timestamps();
            $table->softDeletes();

            $table->index(['entity_type', 'entity_id']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('approval_requests');
        Schema::connection('tenant')->dropIfExists('approval_rules');
    }
};
