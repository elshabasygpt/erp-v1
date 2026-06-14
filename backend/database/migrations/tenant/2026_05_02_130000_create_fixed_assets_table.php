<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->create('fixed_assets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('name_ar')->nullable();
            $table->string('serial_number')->nullable();
            $table->date('purchase_date');
            $table->decimal('purchase_cost', 14, 2);
            $table->decimal('salvage_value', 14, 2)->default(0);
            $table->integer('useful_life_years');
            $table->decimal('accumulated_depreciation', 14, 2)->default(0);
            $table->decimal('current_value', 14, 2);
            $table->enum('status', ['active', 'disposed', 'sold'])->default('active');
            $table->uuid('account_id')->nullable();
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();
            
            $table->foreign('account_id')->references('id')->on('accounts')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('fixed_assets');
    }
};
