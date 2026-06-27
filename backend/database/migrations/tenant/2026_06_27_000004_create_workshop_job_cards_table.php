<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->create('workshop_job_cards', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('job_number', 30)->unique();
            $table->uuid('customer_id')->nullable()->index();
            $table->uuid('customer_vehicle_id')->nullable()->index();
            $table->uuid('technician_id')->nullable()->index()
                ->comment('User assigned as technician');
            // pending | in_progress | waiting_parts | completed | cancelled
            $table->string('status', 30)->default('pending')->index();
            $table->text('complaint')->nullable()
                ->comment('What the customer reported');
            $table->text('diagnosis')->nullable()
                ->comment('Technician diagnosis');
            $table->text('internal_notes')->nullable();
            $table->decimal('labor_cost', 12, 2)->default(0);
            $table->decimal('parts_cost', 12, 2)->default(0);
            $table->decimal('total_cost', 12, 2)->default(0);
            $table->decimal('discount_amount', 12, 2)->default(0);
            $table->decimal('vat_amount', 12, 2)->default(0);
            $table->integer('mileage_in')->nullable();
            $table->timestamp('estimated_completion')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->uuid('invoice_id')->nullable()->index()
                ->comment('Set when job card is converted to a sales invoice');
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'customer_id']);
        });

        Schema::connection('tenant')->create('workshop_job_card_parts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('job_card_id')->index();
            $table->uuid('product_id')->index();
            $table->uuid('warehouse_id')->nullable();
            $table->decimal('quantity', 12, 2)->default(1);
            $table->decimal('unit_price', 12, 2)->default(0);
            $table->decimal('total', 12, 2)->default(0);
            $table->boolean('stock_deducted')->default(false);
            $table->softDeletes();
            $table->timestamps();

            $table->foreign('job_card_id')
                ->references('id')->on('workshop_job_cards')
                ->cascadeOnDelete();
        });

        Schema::connection('tenant')->create('workshop_job_card_services', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('job_card_id')->index();
            $table->string('description');
            $table->decimal('hours', 8, 2)->default(0);
            $table->decimal('rate_per_hour', 12, 2)->default(0);
            $table->decimal('total', 12, 2)->default(0);
            $table->softDeletes();
            $table->timestamps();

            $table->foreign('job_card_id')
                ->references('id')->on('workshop_job_cards')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('workshop_job_card_services');
        Schema::connection('tenant')->dropIfExists('workshop_job_card_parts');
        Schema::connection('tenant')->dropIfExists('workshop_job_cards');
    }
};
