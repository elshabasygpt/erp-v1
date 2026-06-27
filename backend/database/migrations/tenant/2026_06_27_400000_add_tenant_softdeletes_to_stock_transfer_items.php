<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->table('stock_transfer_items', function (Blueprint $table) {
            // tenant_id already added by 2026_06_15_005119_add_tenant_id_to_all_tables
            if (! \Schema::connection('tenant')->hasColumn('stock_transfer_items', 'tenant_id')) {
                $table->uuid('tenant_id')->nullable()->index()->after('id');
            }
            if (! \Schema::connection('tenant')->hasColumn('stock_transfer_items', 'deleted_at')) {
                $table->softDeletes();
            }
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->table('stock_transfer_items', function (Blueprint $table) {
            $table->dropColumn('deleted_at');
        });
    }
};
