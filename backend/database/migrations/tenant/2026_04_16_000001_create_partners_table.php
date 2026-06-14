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
        Schema::create('partners', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('phone')->nullable();
            
            // رأس المال المودع
            $table->decimal('capital_amount', 15, 2)->default(0);
            
            // نسبة الأرباح المتفق عليها (من 0 إلى 100)
            $table->decimal('profit_share_percentage', 5, 2)->default(0);
            
            // رصيد الأرباح غير المسحوبة
            $table->decimal('total_pending', 15, 2)->default(0);
            
            // إجمالي المبالغ المسحوبة
            $table->decimal('total_withdrawn', 15, 2)->default(0);
            
            $table->boolean('is_active')->default(true);
            
            $table->string('created_by')->nullable();
            $table->string('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('partners');
    }
};
