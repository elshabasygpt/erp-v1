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
        Schema::connection('tenant')->create('customer_vehicles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable();
            $table->uuid('customer_id');
            $table->uuid('vehicle_year_id');
            $table->string('plate_number', 20)->nullable();
            $table->string('plate_number_en', 20)->nullable();
            $table->string('color', 50)->nullable();
            $table->unsignedInteger('mileage')->nullable();
            $table->smallInteger('purchase_year')->nullable();
            $table->string('vin', 17)->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('cascade');
            $table->foreign('vehicle_year_id')->references('id')->on('vehicle_years')->onDelete('restrict');

            $table->index(['tenant_id', 'customer_id']);
            $table->index(['tenant_id', 'vehicle_year_id']);
            $table->unique(['tenant_id', 'customer_id', 'plate_number']);
        });

        Schema::connection('tenant')->create('customer_vehicle_service_history', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable();
            $table->uuid('customer_vehicle_id');
            $table->uuid('invoice_id')->nullable();
            $table->date('service_date');
            $table->enum('service_type', ['parts_replacement', 'maintenance', 'inspection', 'other']);
            $table->unsignedInteger('mileage_at_service')->nullable();
            $table->text('description')->nullable();
            $table->unsignedInteger('next_service_mileage')->nullable();
            $table->date('next_service_date')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('customer_vehicle_id', 'fk_cust_veh_service_veh_id')
                ->references('id')->on('customer_vehicles')->onDelete('cascade');
            $table->foreign('invoice_id', 'fk_cust_veh_service_inv_id')
                ->references('id')->on('invoices')->onDelete('set null');

            $table->index(['tenant_id', 'customer_vehicle_id'], 'idx_cust_veh_service_veh_id');
            $table->index(['tenant_id', 'invoice_id'], 'idx_cust_veh_service_inv_id');
            $table->index(['tenant_id', 'service_date'], 'idx_cust_veh_service_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('customer_vehicle_service_history');
        Schema::connection('tenant')->dropIfExists('customer_vehicles');
    }
};
