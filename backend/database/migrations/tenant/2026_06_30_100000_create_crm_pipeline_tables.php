<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * CRM sales pipeline (Kanban): stages + deals. The frontend board
 * (/dashboard/crm) reads stages with nested deals, creates deals, and moves
 * deals between stages via drag-and-drop.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->create('pipeline_stages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable();
            $table->string('name');
            $table->string('name_ar')->nullable();
            $table->string('color', 20)->nullable();
            $table->integer('order_index')->default(0);
            $table->boolean('is_active')->default(true);
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'order_index'], 'idx_pipeline_stages_order');
        });

        Schema::connection('tenant')->create('deals', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable();
            $table->uuid('stage_id');
            $table->uuid('customer_id')->nullable();
            $table->string('title');
            $table->decimal('expected_value', 14, 2)->default(0);
            $table->string('status', 20)->default('open'); // open | won | lost
            $table->integer('order_index')->default(0);
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('stage_id')->references('id')->on('pipeline_stages')->onDelete('cascade');
            $table->index(['tenant_id', 'stage_id', 'order_index'], 'idx_deals_stage_order');
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('deals');
        Schema::connection('tenant')->dropIfExists('pipeline_stages');
    }
};
