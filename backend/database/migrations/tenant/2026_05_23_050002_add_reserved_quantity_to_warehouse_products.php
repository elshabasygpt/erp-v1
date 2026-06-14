<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->table('warehouse_products', function (Blueprint $table) {
            $table->decimal('reserved_quantity', 12, 2)->default(0)->after('quantity');
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->table('warehouse_products', function (Blueprint $table) {
            $table->dropColumn('reserved_quantity');
        });
    }
};
