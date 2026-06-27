<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->create('product_cross_references', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable();
            $table->uuid('product_id');

            $table->string('reference_number', 120);
            $table->string('normalized_number', 120);
            $table->string('reference_brand', 100)->nullable();
            $table->enum('reference_type', ['oem', 'aftermarket', 'equivalent', 'superseded'])->default('oem');
            $table->string('notes', 255)->nullable();

            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');

            $table->unique(['tenant_id', 'product_id', 'normalized_number', 'reference_brand'], 'uq_xref_product_number');
            $table->index(['tenant_id', 'normalized_number'], 'idx_xref_lookup');
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('product_cross_references');
    }
};
