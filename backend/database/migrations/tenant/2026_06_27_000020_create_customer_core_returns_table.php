<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->create('customer_core_returns', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('return_number', 30)->unique();
            $table->uuid('customer_id')->index();
            $table->uuid('warehouse_id');
            $table->uuid('invoice_id')->nullable()->index();
            // pending → received → credited / refunded
            $table->string('status', 20)->default('pending')->index();
            $table->decimal('total_deposit_value', 12, 2)->default(0);
            $table->string('refund_method', 30)->nullable()
                ->comment('cash | store_credit | bank_transfer');
            $table->uuid('credit_note_id')->nullable();
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->timestamp('credited_at')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->index(['tenant_id', 'status']);
        });

        Schema::connection('tenant')->create('customer_core_return_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('core_return_id')->index();
            $table->uuid('product_id')->index();
            $table->decimal('quantity', 12, 2)->default(1);
            $table->string('condition', 20)->default('good')
                ->comment('good | damaged | scrap');
            $table->decimal('unit_deposit_value', 12, 2)->default(0);
            $table->decimal('total', 12, 2)->default(0);
            $table->text('notes')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->foreign('core_return_id')
                ->references('id')->on('customer_core_returns')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('customer_core_return_items');
        Schema::connection('tenant')->dropIfExists('customer_core_returns');
    }
};
