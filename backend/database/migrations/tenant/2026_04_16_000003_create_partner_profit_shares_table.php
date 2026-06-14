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
        Schema::create('partner_profit_shares', function (Blueprint $table) {
            $table->uuid('id')->primary();
            
            // ربط بالتوزيع
            $table->uuid('distribution_id');
            $table->foreign('distribution_id')->references('id')->on('profit_distributions')->onDelete('cascade');
            
            // ربط بالشريك
            $table->uuid('partner_id')->nullable(); 
            // Nullable: إذا كان الشريك هو "صاحب المشروع" نقوم بتسجيل Null أو إنشاء شريك افتراضي للإدارة
            $table->foreign('partner_id')->references('id')->on('partners')->onDelete('cascade');
            
            // Percentage at the time of distribution (snapshot)
            $table->decimal('share_percentage', 5, 2)->default(0);
            
            // المبلغ المخصص له
            $table->decimal('amount', 15, 2)->default(0);
            
            // هل تم سداد المبلغ للشريك فعلياً أم لا يزال في رصيده كمديونية؟
            $table->boolean('is_paid')->default(false);
            $table->timestamp('paid_at')->nullable();
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('partner_profit_shares');
    }
};
