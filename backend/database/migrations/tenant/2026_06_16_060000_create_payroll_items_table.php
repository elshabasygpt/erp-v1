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
        Schema::connection('tenant')->create('payroll_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable();
            $table->uuid('employee_id');
            $table->uuid('payroll_id')->nullable(); // يُربط بـ payroll عند إنشاء المسير

            // الشهر والسنة — للبحث قبل ربط payroll
            $table->unsignedSmallInteger('month');
            $table->unsignedSmallInteger('year');

            // نوع البند
            $table->enum('type', [
                'deduction',   // خصم (جزاء خطأ، تأخير يدوي، غياب...)
                'bonus',       // مكافأة / بدل
                'advance',     // سلفة (مخصومة من الراتب)
                'overtime',    // أوفرتايم / ساعات إضافية
                'other_add',   // إضافة أخرى
                'other_deduct' // خصم آخر
            ]);

            $table->string('reason');       // سبب البند: "جزاء تأخر في تسليم التقرير"
            $table->decimal('amount', 14, 2); // المبلغ دائماً موجب — الـ type يحدد الاتجاه

            // مرجع اختياري (مثلاً ID سجل الحضور للجزاءات التلقائية)
            $table->string('reference_type')->nullable(); // attendance, leave, manual
            $table->uuid('reference_id')->nullable();

            // الموافقة
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('approved');
            $table->text('notes')->nullable();

            $table->uuid('created_by')->nullable();
            $table->uuid('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('employee_id')->references('id')->on('employees')->cascadeOnDelete();
            $table->foreign('payroll_id')->references('id')->on('employee_payrolls')->nullOnDelete();

            $table->index(['tenant_id', 'employee_id', 'month', 'year']);
            $table->index(['tenant_id', 'payroll_id']);
            $table->index(['tenant_id', 'type', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('payroll_items');
    }
};
