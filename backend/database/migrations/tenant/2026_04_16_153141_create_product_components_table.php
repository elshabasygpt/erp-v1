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
        Schema::connection('tenant')->create('product_components', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('parent_product_id'); // The assembled item
            $table->uuid('child_product_id');  // The raw material
            $table->decimal('quantity_required', 12, 3);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('parent_product_id')->references('id')->on('products')->onDelete('cascade');
            $table->foreign('child_product_id')->references('id')->on('products')->onDelete('cascade');
            $table->unique(['parent_product_id', 'child_product_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('product_components');
    }
};
