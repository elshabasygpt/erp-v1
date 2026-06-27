<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->table('invoices', function (Blueprint $table) {
            $table->index(['tenant_id', 'status', 'invoice_date'], 'idx_dashboard_perf');
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->table('invoices', function (Blueprint $table) {
            $table->dropIndex('idx_dashboard_perf');
        });
    }
};
