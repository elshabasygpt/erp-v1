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
        Schema::create('supplier_core_returns', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('warehouse_id')->index();
            $table->uuid('supplier_id')->index();
            $table->string('return_number')->unique();
            $table->string('status')->default('draft'); // draft, shipped, credited
            $table->decimal('total_credit_value', 15, 2)->default(0);
            $table->uuid('credit_note_id')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamp('shipped_at')->nullable();
            $table->timestamp('credited_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('supplier_core_return_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('core_return_id')->index();
            $table->uuid('product_id')->index();
            $table->decimal('quantity', 15, 2);
            $table->decimal('core_value', 15, 2);
            $table->decimal('total_value', 15, 2);
            $table->timestamps();

            $table->foreign('core_return_id')->references('id')->on('supplier_core_returns')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('supplier_core_return_items');
        Schema::dropIfExists('supplier_core_returns');
    }
};
