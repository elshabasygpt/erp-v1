<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->table('products', function (Blueprint $table) {
            $table->decimal('wholesale_price', 12, 2)->nullable()->after('sell_price');
            $table->decimal('semi_wholesale_price', 12, 2)->nullable()->after('wholesale_price');
        });

        // بعد إضافة الأعمدة، احسب قيمة افتراضية للمنتجات الموجودة
        // wholesale = 80% من sell_price / semi_wholesale = 90% من sell_price
        DB::connection('tenant')->statement("
            UPDATE products
            SET
                wholesale_price = ROUND(sell_price * 0.80, 2),
                semi_wholesale_price = ROUND(sell_price * 0.90, 2)
            WHERE wholesale_price IS NULL AND sell_price > 0
        ");
    }

    public function down(): void
    {
        Schema::connection('tenant')->table('products', function (Blueprint $table) {
            $table->dropColumn(['wholesale_price', 'semi_wholesale_price']);
        });
    }
};
