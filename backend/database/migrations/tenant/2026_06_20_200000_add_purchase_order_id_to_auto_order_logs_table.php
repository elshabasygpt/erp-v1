<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::connection('tenant')->table('auto_order_logs', function (Blueprint $table) {
            if (!Schema::connection('tenant')->hasColumn('auto_order_logs', 'purchase_order_id')) {
                $table->uuid('purchase_order_id')->nullable()->after('purchase_invoice_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('tenant')->table('auto_order_logs', function (Blueprint $table) {
            if (Schema::connection('tenant')->hasColumn('auto_order_logs', 'purchase_order_id')) {
                $table->dropColumn('purchase_order_id');
            }
        });
    }
};
