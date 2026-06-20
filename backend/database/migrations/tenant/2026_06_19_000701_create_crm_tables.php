<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crm_stages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('name');
            $table->string('name_ar')->nullable();
            $table->string('color')->default('#e2e8f0');
            $table->integer('order_index')->default(0);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
        });

        Schema::create('crm_deals', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('stage_id');
            $table->string('title');
            $table->decimal('expected_value', 15, 2)->default(0);
            $table->uuid('customer_id')->nullable();
            $table->uuid('assigned_to')->nullable(); // salesperson
            $table->date('expected_close_date')->nullable();
            $table->integer('probability_percent')->default(50);
            $table->string('status')->default('open'); // open, won, lost
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('stage_id')->references('id')->on('crm_stages')->onDelete('cascade');
            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('set null');
            $table->foreign('assigned_to')->references('id')->on('users')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_deals');
        Schema::dropIfExists('crm_stages');
    }
};
