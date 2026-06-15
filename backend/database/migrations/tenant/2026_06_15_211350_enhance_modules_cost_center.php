<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $tables = [
            'invoices',
            'purchase_invoices',
            'customer_payments',
            'supplier_payments',
            'safe_transactions'
        ];

        foreach ($tables as $tableName) {
            if (Schema::connection('tenant')->hasTable($tableName)) {
                Schema::connection('tenant')->table($tableName, function (Blueprint $table) {
                    $table->uuid('cost_center_id')->nullable();
                });
            }
        }
    }

    public function down(): void
    {
        $tables = [
            'invoices',
            'purchase_invoices',
            'customer_payments',
            'supplier_payments',
            'safe_transactions'
        ];

        foreach ($tables as $tableName) {
            if (Schema::connection('tenant')->hasTable($tableName)) {
                Schema::connection('tenant')->table($tableName, function (Blueprint $table) {
                    $table->dropColumn('cost_center_id');
                });
            }
        }
    }
};
