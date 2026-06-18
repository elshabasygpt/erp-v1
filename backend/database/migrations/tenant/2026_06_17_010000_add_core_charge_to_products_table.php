<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (! Schema::hasColumn('products', 'has_core_charge')) {
                $table->boolean('has_core_charge')->default(false)->after('warranty_months');
            }
            if (! Schema::hasColumn('products', 'core_charge_amount')) {
                $table->decimal('core_charge_amount', 15, 2)->default(0.00)->after('has_core_charge');
            }
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['has_core_charge', 'core_charge_amount']);
        });
    }
};
