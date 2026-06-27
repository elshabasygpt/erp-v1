<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->create('stock_write_offs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('reference_number')->unique();
            $table->uuid('warehouse_id');
            $table->text('reason');
            $table->enum('reason_type', ['damaged', 'expired', 'obsolete', 'theft', 'other'])->default('other');
            $table->decimal('total_cost', 16, 4)->default(0);
            $table->uuid('approved_by')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'created_at']);
        });

        Schema::connection('tenant')->create('stock_write_off_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('write_off_id');
            $table->uuid('product_id');
            $table->uuid('warehouse_id');
            $table->decimal('quantity', 16, 4);
            $table->decimal('cost_per_unit', 16, 4)->default(0);
            $table->decimal('total_cost', 16, 4)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('write_off_id')->references('id')->on('stock_write_offs')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('stock_write_off_items');
        Schema::connection('tenant')->dropIfExists('stock_write_offs');
    }
};
