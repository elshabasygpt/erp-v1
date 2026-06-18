<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->create('employee_loans', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable();
            $table->uuid('employee_id');

            $table->string('loan_number')->unique();           // SLF-000001
            $table->decimal('total_amount', 14, 2);            // إجمالي السلفة
            $table->decimal('remaining_amount', 14, 2);        // المتبقي للخصم
            $table->unsignedSmallInteger('installments_count');// عدد الأقساط
            $table->decimal('installment_amount', 14, 2);      // قيمة القسط الشهري

            $table->date('start_date');     // تاريخ بداية الخصم
            $table->date('end_date');       // تاريخ نهاية الخصم (محسوب)

            $table->enum('status', ['active', 'completed', 'cancelled', 'paused'])->default('active');

            $table->text('reason')->nullable();
            $table->text('notes')->nullable();
            $table->uuid('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('employee_id')->references('id')->on('employees')->cascadeOnDelete();
            $table->index(['tenant_id', 'employee_id', 'status']);
        });

        Schema::connection('tenant')->create('employee_loan_installments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable();
            $table->uuid('loan_id');
            $table->uuid('payroll_id')->nullable();           // الراتب الذي خُصم منه

            $table->unsignedSmallInteger('installment_number'); // 1, 2, 3...
            $table->unsignedSmallInteger('month');
            $table->unsignedSmallInteger('year');
            $table->decimal('amount', 14, 2);
            $table->enum('status', ['pending', 'deducted', 'skipped'])->default('pending');
            $table->date('due_date');
            $table->timestamp('deducted_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('loan_id')->references('id')->on('employee_loans')->cascadeOnDelete();
            $table->foreign('payroll_id')->references('id')->on('employee_payrolls')->nullOnDelete();

            $table->unique(['loan_id', 'installment_number']);
            $table->index(['tenant_id', 'month', 'year', 'status']);  // للجلب السريع في مسير الرواتب
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('employee_loan_installments');
        Schema::connection('tenant')->dropIfExists('employee_loans');
    }
};
