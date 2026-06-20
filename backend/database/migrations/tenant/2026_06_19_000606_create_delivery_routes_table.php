<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->create('delivery_routes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('name')->nullable();
            $table->uuid('driver_id')->nullable();
            $table->uuid('vehicle_id')->nullable();
            $table->date('route_date');
            $table->string('status')->default('draft'); // draft, active, completed
            $table->timestamps();
            $table->softDeletes();
            
            $table->index('tenant_id');
            $table->index('driver_id');
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('delivery_routes');
    }
};
