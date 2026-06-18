<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->table('employee_payrolls', function (Blueprint $table) {
            if (!Schema::connection('tenant')->hasColumn('employee_payrolls', 'loan_deductions')) {
                $table->decimal('loan_deductions', 14, 2)->default(0)->after('deductions');
            }
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->table('employee_payrolls', function (Blueprint $table) {
            if (Schema::connection('tenant')->hasColumn('employee_payrolls', 'loan_deductions')) {
                $table->dropColumn('loan_deductions');
            }
        });
    }
};
