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
        Schema::create('sales_channels', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('code')->unique();
            $table->string('type')->default('delivery'); // delivery, internal, marketplace, custom
            $table->string('pricing_method')->default('percentage'); // percentage, fixed
            $table->decimal('markup_percentage', 5, 2)->default(0);
            $table->decimal('fixed_markup', 15, 2)->default(0);
            $table->boolean('apply_before_tax')->default(true);
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sales_channels');
    }
};
