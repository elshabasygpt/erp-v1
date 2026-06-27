<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->create('warehouse_bin_locations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('warehouse_id');
            $table->string('zone', 50)->nullable();
            $table->string('rack', 50)->nullable();
            $table->string('shelf', 50)->nullable();
            $table->string('bin', 50)->nullable();
            $table->string('full_path', 200)->nullable();
            $table->string('name', 255)->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->decimal('capacity', 12, 4)->nullable()->comment('Max units storable in this bin');
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('warehouse_id')
                ->references('id')->on('warehouses')
                ->cascadeOnDelete();

            $table->unique(['warehouse_id', 'zone', 'rack', 'shelf', 'bin'], 'unique_bin_per_warehouse');
            $table->index(['warehouse_id', 'zone']);
            $table->index(['warehouse_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('warehouse_bin_locations');
    }
};
