<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Employees (الموظفين)
        Schema::connection('tenant')->create('employees', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id')->nullable(); // Optional link if the employee is also a system user
            $table->string('name');
            $table->string('position')->nullable(); // المسمى الوظيفي
            $table->string('phone')->nullable();
            
            // Work rules
            $table->decimal('base_salary', 14, 2)->default(0);
            $table->time('shift_start')->nullable(); // وقت الحضور الافتراضي
            $table->time('shift_end')->nullable();   // وقت الانصراف الافتراضي
            
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
            
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
        });

        // 2. Attendance (حضور وانصراف)
        Schema::connection('tenant')->create('employee_attendances', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('employee_id');
            $table->date('date');
            $table->time('check_in')->nullable();
            $table->time('check_out')->nullable();
            $table->integer('late_minutes')->default(0); 
            $table->enum('status', ['present', 'absent', 'late', 'on_leave'])->default('present');
            $table->text('notes')->nullable();
            $table->timestamps();
            
            $table->foreign('employee_id')->references('id')->on('employees')->cascadeOnDelete();
            $table->unique(['employee_id', 'date']);
        });

        // 3. Leaves (الإجازات)
        Schema::connection('tenant')->create('employee_leaves', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('employee_id');
            $table->date('start_date');
            $table->date('end_date');
            $table->enum('type', ['annual', 'sick', 'unpaid', 'other'])->default('annual');
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->text('reason')->nullable();
            $table->timestamps();

            $table->foreign('employee_id')->references('id')->on('employees')->cascadeOnDelete();
        });

        // 4. Payrolls (مسيرات الرواتب)
        Schema::connection('tenant')->create('employee_payrolls', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('employee_id');
            $table->integer('month');
            $table->integer('year');
            $table->decimal('base_salary', 14, 2);
            $table->decimal('bonuses', 14, 2)->default(0);
            $table->decimal('deductions', 14, 2)->default(0); // الخصومات (تأخير وغيره)
            $table->decimal('net_salary', 14, 2);
            $table->enum('status', ['draft', 'paid'])->default('draft');
            $table->uuid('expense_id')->nullable(); // الربط بالمصروفات إذا تم الدفع
            $table->timestamps();

            $table->foreign('employee_id')->references('id')->on('employees')->cascadeOnDelete();
            // Optional: link to global expenses if paid from treasury
            $table->foreign('expense_id')->references('id')->on('expenses')->nullOnDelete();
            
            $table->unique(['employee_id', 'month', 'year']);
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('employee_payrolls');
        Schema::connection('tenant')->dropIfExists('employee_leaves');
        Schema::connection('tenant')->dropIfExists('employee_attendances');
        Schema::connection('tenant')->dropIfExists('employees');
    }
};
