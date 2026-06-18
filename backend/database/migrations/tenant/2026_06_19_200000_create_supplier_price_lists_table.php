<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->create('supplier_price_lists', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable();
            $table->uuid('supplier_id');
            $table->uuid('product_id');

            $table->decimal('unit_price', 14, 4);     // سعر المورد بدقة 4 كسور (أسعار الاستيراد)
            $table->string('currency_code', 3)->default('SAR'); // SAR / USD / EUR
            $table->decimal('min_quantity', 12, 2)->default(1); // الحد الأدنى للطلب
            $table->string('supplier_sku')->nullable();         // كود القطعة عند المورد
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->date('valid_from')->nullable();             // صلاحية السعر من
            $table->date('valid_until')->nullable();            // صلاحية السعر حتى (null = لا نهاية)
            $table->date('last_purchase_date')->nullable();     // آخر مرة اشترينا بهذا السعر
            $table->integer('lead_time_days')->nullable();      // أيام التوريد

            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('supplier_id')->references('id')->on('suppliers')->onDelete('cascade');
            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');

            // منع تكرار نفس المورد لنفس القطعة مرتين في نفس الـ tenant
            $table->unique(['tenant_id', 'supplier_id', 'product_id'], 'uq_supplier_product_price');

            $table->index(['tenant_id', 'product_id']);
            $table->index(['tenant_id', 'supplier_id']);
            $table->index(['tenant_id', 'product_id', 'unit_price']); // للبحث عن أرخص سعر
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('supplier_price_lists');
    }
};
