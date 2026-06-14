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
        Schema::create('profit_distributions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            
            // تاريخ بداية ونهاية الدورة المحاسبية للتوزيع
            $table->date('period_start');
            $table->date('period_end');
            
            // إجماليات الدورة
            $table->decimal('total_revenue', 15, 2)->default(0);
            $table->decimal('total_expenses', 15, 2)->default(0);
            $table->decimal('net_profit', 15, 2)->default(0);
            
            // المبلغ الذي تقرر توزيعه فعلياً (قد يكون أقل من صافي الربح إذا أراد المالك الاحتفاظ بجزء)
            $table->decimal('distributed_amount', 15, 2)->default(0);
            
            // حالة التوزيع
            $table->enum('status', ['draft', 'approved'])->default('draft');
            
            $table->text('notes')->nullable();
            
            $table->string('created_by')->nullable();
            $table->string('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('profit_distributions');
    }
};
