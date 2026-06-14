<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->create('product_units', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('product_id');
            $table->string('unit_name'); // e.g. Carton, Box, Dozen
            $table->decimal('conversion_factor', 10, 4); // e.g. 12 (1 Carton = 12 pieces)
            $table->string('barcode')->nullable()->unique();
            $table->decimal('sell_price', 12, 2)->nullable(); // Optional price override for this unit
            $table->timestamps();

            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('product_units');
    }
};
