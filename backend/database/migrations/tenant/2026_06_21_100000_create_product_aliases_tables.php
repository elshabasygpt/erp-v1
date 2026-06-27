<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_aliases', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('product_id');
            $table->string('alias_name');
            $table->boolean('is_default_print')->default(false);
            $table->integer('sort_order')->default(0);
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
            $table->index('tenant_id');
            $table->index('product_id');
            $table->index('alias_name');
            $table->index(['tenant_id', 'alias_name']);
        });

        Schema::create('product_customer_aliases', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('product_id');
            $table->uuid('customer_id');
            $table->string('alias_name');
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('cascade');
            $table->index('tenant_id');
            $table->index('product_id');
            $table->index('customer_id');
            $table->unique(['tenant_id', 'customer_id', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_customer_aliases');
        Schema::dropIfExists('product_aliases');
    }
};
