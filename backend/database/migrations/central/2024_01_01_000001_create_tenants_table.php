<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('pgsql')->create('tenants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('domain')->unique();
            $table->string('database_name')->unique();
            $table->enum('status', ['active', 'suspended', 'trial', 'cancelled'])->default('trial');
            $table->timestamp('trial_ends_at')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('status');
            $table->index('domain');
        });
    }

    public function down(): void
    {
        Schema::connection('pgsql')->dropIfExists('tenants');
    }
};
