<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add tenant_id to advanced procurement tables
     */
    public function up(): void
    {
        $tables = [
            'purchase_requests',
            'rfqs',
            'supplier_quotations',
            'purchase_orders',
        ];

        foreach ($tables as $table) {
            if (Schema::connection('tenant')->hasTable($table) &&
                !Schema::connection('tenant')->hasColumn($table, 'tenant_id')) {

                Schema::connection('tenant')->table($table, function (Blueprint $table) {
                    $table->uuid('tenant_id')->nullable()->after('id');
                    $table->index('tenant_id');
                });
            }
        }
    }

    public function down(): void
    {
        $tables = [
            'purchase_requests',
            'rfqs',
            'supplier_quotations',
            'purchase_orders',
        ];

        foreach ($tables as $table) {
            if (Schema::connection('tenant')->hasTable($table) &&
                Schema::connection('tenant')->hasColumn($table, 'tenant_id')) {

                Schema::connection('tenant')->table($table, function (Blueprint $blueprint) {
                    $blueprint->dropIndex(['tenant_id']);
                    $blueprint->dropColumn('tenant_id');
                });
            }
        }
    }
};
