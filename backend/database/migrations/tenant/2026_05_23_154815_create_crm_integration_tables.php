<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->create('customer_notes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('customer_id');
            $table->uuid('user_id');
            $table->text('content');
            $table->timestamps();
            $table->softDeletes();
            
            $table->index('customer_id');
        });

        Schema::connection('tenant')->create('customer_interactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('customer_id');
            $table->uuid('user_id');
            $table->string('type'); // call, email, meeting, whatsapp
            $table->text('description')->nullable();
            $table->timestamp('interaction_date');
            $table->timestamps();
            $table->softDeletes();
            
            $table->index('customer_id');
        });

        Schema::connection('tenant')->create('sales_follow_ups', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('customer_id');
            $table->uuid('assigned_to');
            $table->string('title');
            $table->text('description')->nullable();
            $table->timestamp('due_date')->nullable();
            $table->timestamp('reminder_at')->nullable();
            $table->string('status')->default('pending'); // pending, completed, cancelled
            $table->timestamps();
            $table->softDeletes();
            
            $table->index('assigned_to');
            $table->index('customer_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('sales_follow_ups');
        Schema::connection('tenant')->dropIfExists('customer_interactions');
        Schema::connection('tenant')->dropIfExists('customer_notes');
    }
};
