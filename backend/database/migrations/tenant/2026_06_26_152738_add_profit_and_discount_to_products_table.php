<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->table('products', function (Blueprint $table) {
            $table->decimal('profit_percent', 8, 2)->nullable()->default(0)->after('cost_price');
            $table->decimal('default_discount_percent', 5, 2)->nullable()->default(0)->after('profit_percent');
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->table('products', function (Blueprint $table) {
            $table->dropColumn(['profit_percent', 'default_discount_percent']);
        });
    }
};
