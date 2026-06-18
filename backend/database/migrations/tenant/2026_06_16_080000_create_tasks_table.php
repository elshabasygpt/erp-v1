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
        Schema::connection('tenant')->create('tasks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable();

            $table->string('title');                    // عنوان المهمة
            $table->text('description')->nullable();    // تفاصيل اختيارية

            // الأولوية
            $table->enum('priority', ['low', 'medium', 'high', 'urgent'])->default('medium');

            // الحالة
            $table->enum('status', [
                'todo',         // للتنفيذ
                'in_progress',  // جاري
                'done',         // منجز
                'cancelled',    // ملغي
            ])->default('todo');

            // التصنيف الحر — للتجميع (مثل: "مبيعات", "مشتريات", "إدارية")
            $table->string('category')->nullable();
            $table->string('color', 7)->nullable();     // hex color للـ category

            // المواعيد
            $table->date('due_date')->nullable();        // تاريخ الاستحقاق
            $table->time('due_time')->nullable();        // وقت الاستحقاق (اختياري)
            $table->timestamp('reminder_at')->nullable(); // وقت إرسال التذكير

            // المُعيِّن والمُعيَّن
            $table->uuid('created_by');                 // من أنشأها
            $table->uuid('assigned_to')->nullable();    // مُعيَّن لمن (null = لنفسي)

            // ربط بكيانات النظام (اختياري)
            $table->string('related_type')->nullable();  // customer, invoice, supplier, employee...
            $table->uuid('related_id')->nullable();
            $table->string('related_label')->nullable(); // "أحمد محمد" أو "INV-0045" — للعرض

            // ترتيب داخل الـ Kanban column
            $table->unsignedSmallInteger('sort_order')->default(0);

            // تاريخ الإنجاز الفعلي
            $table->timestamp('completed_at')->nullable();

            $table->uuid('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'assigned_to', 'status']);
            $table->index(['tenant_id', 'created_by', 'status']);
            $table->index(['tenant_id', 'due_date', 'status']);
            $table->index(['tenant_id', 'status', 'priority']);
            $table->index(['tenant_id', 'related_type', 'related_id']);
        });

        Schema::connection('tenant')->create('task_comments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable();
            $table->uuid('task_id');
            $table->uuid('user_id');
            $table->text('content');
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('task_id')->references('id')->on('tasks')->cascadeOnDelete();
            $table->index(['tenant_id', 'task_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('task_comments');
        Schema::connection('tenant')->dropIfExists('tasks');
    }
};
