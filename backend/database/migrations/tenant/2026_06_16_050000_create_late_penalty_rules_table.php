<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->create('late_penalty_rules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable();

            // نطاق التأخير بالدقائق
            $table->unsignedSmallInteger('late_from_minutes');  // من X دقيقة
            $table->unsignedSmallInteger('late_to_minutes');    // إلى Y دقيقة (0 = ما فوق)

            // نوع الخصم
            $table->enum('deduction_type', ['fixed', 'per_minute', 'percentage_of_daily']);
            // fixed = مبلغ ثابت | per_minute = مبلغ × عدد الدقائق | percentage_of_daily = نسبة من اليومي

            $table->decimal('deduction_value', 10, 2);
            // fixed: المبلغ الثابت مثل 50
            // per_minute: المبلغ لكل دقيقة مثل 2
            // percentage_of_daily: النسبة مثل 50 = 50% من الراتب اليومي

            $table->unsignedSmallInteger('grace_minutes')->default(0);
            // دقائق السماح قبل احتساب التأخير (مثل 15 دقيقة سماح)
            // إذا grace_minutes = 15 → التأخير 14 دقيقة = لا جزاء

            $table->string('label')->nullable();     // وصف القاعدة: "تأخير بسيط"
            $table->string('label_ar')->nullable();  // "تأخير خفيف"
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0); // ترتيب التطبيق

            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'is_active', 'late_from_minutes']);
        });

        // الإعدادات الافتراضية — تتنشأ فور تشغيل الـ migration
        // يمكن تعديلها من الواجهة لاحقاً
        DB::connection('tenant')->table('late_penalty_rules')->insert([
            [
                'id' => Str::uuid(),
                'late_from_minutes' => 1,  'late_to_minutes' => 15,
                'deduction_type' => 'fixed',  'deduction_value' => 0,
                'grace_minutes' => 0,
                'label' => 'Minor Late (1-15 min)', 'label_ar' => 'تأخير بسيط (1-15 دقيقة)',
                'is_active' => true, 'sort_order' => 1, 'created_at' => now(), 'updated_at' => now(),
            ],
            [
                'id' => Str::uuid(),
                'late_from_minutes' => 16, 'late_to_minutes' => 60,
                'deduction_type' => 'per_minute', 'deduction_value' => 2,
                'grace_minutes' => 0,
                'label' => 'Moderate Late (16-60 min)', 'label_ar' => 'تأخير متوسط (16-60 دقيقة)',
                'is_active' => true, 'sort_order' => 2, 'created_at' => now(), 'updated_at' => now(),
            ],
            [
                'id' => Str::uuid(),
                'late_from_minutes' => 61, 'late_to_minutes' => 0,
                'deduction_type' => 'percentage_of_daily', 'deduction_value' => 100,
                'grace_minutes' => 0,
                'label' => 'Severe Late (+60 min)', 'label_ar' => 'تأخير شديد (أكثر من ساعة)',
                'is_active' => true, 'sort_order' => 3, 'created_at' => now(), 'updated_at' => now(),
            ],
        ]);
    }

    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('late_penalty_rules');
    }
};
