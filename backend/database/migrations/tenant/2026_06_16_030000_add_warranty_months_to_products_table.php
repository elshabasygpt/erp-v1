<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->table('products', function (Blueprint $table) {
            // مدة الضمان الافتراضية للمنتج بالأشهر (0 = بدون ضمان)
            $table->unsignedSmallInteger('warranty_months')->default(0)->after('quality_grade');
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->table('products', function (Blueprint $table) {
            $table->dropColumn('warranty_months');
        });
    }
};
