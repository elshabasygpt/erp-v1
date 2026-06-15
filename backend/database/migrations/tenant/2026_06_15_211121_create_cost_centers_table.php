<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->create('cost_centers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('parent_id')->nullable();
            $table->string('code')->nullable();
            $table->string('name');
            $table->string('type')->default('department'); // e.g., branch, department, project
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('tenant_id');
            $table->index('parent_id');
            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('cost_centers');
    }
};
