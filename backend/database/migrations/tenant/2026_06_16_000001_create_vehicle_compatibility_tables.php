<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Vehicle Makes (ماركات السيارات)
        Schema::connection('tenant')->create('vehicle_makes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->default('00000000-0000-0000-0000-000000000001')->nullable();
            $table->string('name');
            $table->string('name_ar');
            $table->string('logo_url')->nullable();
            $table->boolean('is_active')->default(true);
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // 2. Vehicle Models (موديلات السيارات)
        Schema::connection('tenant')->create('vehicle_models', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->default('00000000-0000-0000-0000-000000000001')->nullable();
            $table->uuid('make_id');
            $table->string('name');
            $table->string('name_ar');
            $table->string('body_type')->nullable(); // sedan, suv, pickup, van, truck
            $table->boolean('is_active')->default(true);
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('make_id')->references('id')->on('vehicle_makes')->onDelete('cascade');
            $table->index(['tenant_id', 'make_id']);
        });

        // 3. Vehicle Years (سنوات الصنع)
        Schema::connection('tenant')->create('vehicle_years', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->default('00000000-0000-0000-0000-000000000001')->nullable();
            $table->uuid('model_id');
            $table->smallInteger('year_from');
            $table->smallInteger('year_to')->nullable();
            $table->string('engine_size')->nullable();
            $table->string('engine_code')->nullable();
            $table->enum('fuel_type', ['petrol', 'diesel', 'hybrid', 'electric'])->default('petrol');
            $table->boolean('is_active')->default(true);
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('model_id')->references('id')->on('vehicle_models')->onDelete('cascade');
            $table->index(['tenant_id', 'model_id', 'year_from', 'year_to'], 'idx_vehicle_years_search');
        });

        // 4. Product Vehicle Compatibility (جدول التوافق)
        Schema::connection('tenant')->create('product_vehicle_compatibility', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->default('00000000-0000-0000-0000-000000000001')->nullable();
            $table->uuid('product_id');
            $table->uuid('vehicle_year_id');
            $table->string('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();

            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
            $table->foreign('vehicle_year_id')->references('id')->on('vehicle_years')->onDelete('cascade');

            $table->unique(['tenant_id', 'product_id', 'vehicle_year_id'], 'uq_product_vehicle');
            $table->index(['tenant_id', 'product_id']);
            $table->index(['tenant_id', 'vehicle_year_id']);
        });

        // 5. Update existing products table
        Schema::connection('tenant')->table('products', function (Blueprint $table) {
            $table->string('oem_number')->nullable()->after('sku');
            $table->string('part_number')->nullable()->after('oem_number');
            $table->string('brand')->nullable()->after('part_number');
            $table->enum('quality_grade', ['original', 'oem', 'aftermarket', 'used'])->nullable()->after('brand');
            $table->string('country_of_origin')->nullable()->after('quality_grade');

            $table->index(['tenant_id', 'oem_number']);
            $table->index(['tenant_id', 'part_number']);
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->table('products', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'part_number']);
            $table->dropIndex(['tenant_id', 'oem_number']);
            $table->dropColumn(['oem_number', 'part_number', 'brand', 'quality_grade', 'country_of_origin']);
        });

        Schema::connection('tenant')->dropIfExists('product_vehicle_compatibility');
        Schema::connection('tenant')->dropIfExists('vehicle_years');
        Schema::connection('tenant')->dropIfExists('vehicle_models');
        Schema::connection('tenant')->dropIfExists('vehicle_makes');
    }
};
