<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1A: جدول مواعيد الموردين
        Schema::connection('tenant')->create('supplier_ordering_schedules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable();
            $table->uuid('supplier_id');
            $table->unsignedTinyInteger('order_day_of_week');
            $table->unsignedTinyInteger('lead_time_days')->default(2);
            $table->unsignedTinyInteger('frequency_weeks')->default(1);
            $table->time('order_time')->default('09:00:00');
            $table->boolean('reminder_enabled')->default(true);
            $table->unsignedTinyInteger('reminder_hours_before')->default(24);
            $table->string('responsible_email')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('supplier_id')->references('id')->on('suppliers')->cascadeOnDelete();
            $table->index(['tenant_id', 'supplier_id']);
            $table->index(['tenant_id', 'order_day_of_week', 'is_active']);
        });

        // 1B: المورد الافتراضي لكل قطعة
        Schema::connection('tenant')->create('product_default_suppliers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable();
            $table->uuid('product_id');
            $table->uuid('supplier_id');
            $table->decimal('reorder_quantity', 12, 2)->default(1);
            $table->decimal('preferred_unit_price', 14, 2)->nullable();
            $table->unsignedTinyInteger('priority')->default(1);
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();
            $table->foreign('supplier_id')->references('id')->on('suppliers')->cascadeOnDelete();

            $table->unique(['tenant_id', 'product_id', 'priority'], 'uq_product_supplier_priority');
            $table->index(['tenant_id', 'supplier_id']);
        });

        // 1C: سجل الطلبيات التلقائية
        Schema::connection('tenant')->create('auto_order_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable();
            $table->uuid('supplier_id');
            $table->uuid('purchase_invoice_id')->nullable();
            $table->enum('trigger', ['manual', 'scheduled', 'low_stock_alert']);
            $table->integer('items_count')->default(0);
            $table->decimal('total_amount', 14, 2)->default(0);
            $table->boolean('notification_sent')->default(false);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'supplier_id']);
            $table->index(['tenant_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('auto_order_logs');
        Schema::connection('tenant')->dropIfExists('product_default_suppliers');
        Schema::connection('tenant')->dropIfExists('supplier_ordering_schedules');
    }
};
