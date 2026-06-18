<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->create('supplier_price_history', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable();
            $table->uuid('price_list_id');
            $table->decimal('old_price', 14, 4);
            $table->decimal('new_price', 14, 4);
            $table->decimal('change_percent', 6, 2); // % التغيير (موجب = ارتفع، سالب = انخفض)
            $table->string('change_reason')->nullable(); // "تحديث يدوي" / "من فاتورة شراء" / "من RFQ"
            $table->uuid('reference_id')->nullable();    // id الفاتورة أو RFQ اللي سبّب التحديث
            $table->uuid('created_by')->nullable();
            $table->timestamps();

            $table->foreign('price_list_id')->references('id')->on('supplier_price_lists')->cascadeOnDelete();
            $table->index(['tenant_id', 'price_list_id']);
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('supplier_price_history');
    }
};
