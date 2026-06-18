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
        Schema::connection('tenant')->table('employee_payrolls', function (Blueprint $table) {
            // توقيع الموظف على قسيمة الراتب
            $table->string('employee_signature_url')->nullable()->after('expense_id');
            $table->timestamp('signed_at')->nullable()->after('employee_signature_url');
            $table->text('payslip_notes')->nullable()->after('signed_at');

            // breakdown مفصّل للخصومات والمكافآت (JSON snapshot وقت الإنشاء)
            $table->json('deductions_breakdown')->nullable()->after('payslip_notes');
            $table->json('bonuses_breakdown')->nullable()->after('deductions_breakdown');
            $table->json('advances_breakdown')->nullable()->after('bonuses_breakdown');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('tenant')->table('employee_payrolls', function (Blueprint $table) {
            $table->dropColumn([
                'employee_signature_url',
                'signed_at',
                'payslip_notes',
                'deductions_breakdown',
                'bonuses_breakdown',
                'advances_breakdown',
            ]);
        });
    }
};
