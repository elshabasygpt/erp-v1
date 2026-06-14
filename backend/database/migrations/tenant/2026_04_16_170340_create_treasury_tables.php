<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Safes Table (الخزائن البنكية والنقدية)
        Schema::connection('tenant')->create('safes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('name_ar')->nullable();
            $table->enum('type', ['cash', 'bank']); // نقدية أو بنكية
            $table->decimal('balance', 14, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // 2. Safe Users (صلاحيات الكاشير على الخزائن)
        Schema::connection('tenant')->create('safe_users', function (Blueprint $table) {
            $table->id();
            $table->uuid('safe_id');
            $table->uuid('user_id');
            $table->boolean('is_primary')->default(false); // الخزينة الرئيسية للكاشير
            $table->timestamps();

            $table->foreign('safe_id')->references('id')->on('safes')->onDelete('cascade');
            $table->unique(['safe_id', 'user_id']);
        });

        // 3. Safe Transactions (حركات الخزينة: إيداع، سحب، تحويل)
        Schema::connection('tenant')->create('safe_transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('safe_id');
            $table->enum('type', ['deposit', 'withdrawal', 'transfer_in', 'transfer_out']);
            $table->decimal('amount', 14, 2);
            $table->text('description')->nullable();
            $table->uuid('reference_id')->nullable(); // قد ترتبط برقم فاتورة أو زميل
            $table->string('reference_type')->nullable(); // sales_invoice | purchase_invoice | expense | transfer
            $table->dateTime('transaction_date');
            $table->uuid('created_by')->nullable();
            $table->timestamps();

            $table->foreign('safe_id')->references('id')->on('safes')->onDelete('cascade');
        });

        // 4. Expense Categories (بنود المصروفات)
        Schema::connection('tenant')->create('expense_categories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('name_ar')->nullable();
            $table->boolean('is_advance_or_salary')->default(false); // لتسهيل عزل السلف والرواتب
            $table->timestamps();
            $table->softDeletes();
        });

        // 5. Expenses (مصروفات الخزينة)
        Schema::connection('tenant')->create('expenses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('category_id');
            $table->uuid('safe_id');
            $table->decimal('amount', 14, 2);
            $table->text('description')->nullable();
            $table->dateTime('expense_date');
            $table->uuid('created_by')->nullable(); // الموظف الذي صُرفت له سلفة أو الموظف المسجل
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('category_id')->references('id')->on('expense_categories');
            $table->foreign('safe_id')->references('id')->on('safes');
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('expenses');
        Schema::connection('tenant')->dropIfExists('expense_categories');
        Schema::connection('tenant')->dropIfExists('safe_transactions');
        Schema::connection('tenant')->dropIfExists('safe_users');
        Schema::connection('tenant')->dropIfExists('safes');
    }
};
