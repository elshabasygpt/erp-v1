<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $tables = ['quotations', 'sales_orders', 'invoices', 'customer_payments'];

        foreach ($tables as $tableName) {
            Schema::connection('tenant')->table($tableName, function (Blueprint $table) {
                $table->uuid('currency_id')->nullable()->after('tenant_id');
                $table->decimal('exchange_rate', 18, 6)->default(1.0)->after('currency_id');
            });
        }
    }

    public function down(): void
    {
        $tables = ['quotations', 'sales_orders', 'invoices', 'customer_payments'];

        foreach ($tables as $tableName) {
            Schema::connection('tenant')->table($tableName, function (Blueprint $table) {
                $table->dropColumn(['currency_id', 'exchange_rate']);
            });
        }
    }
};
