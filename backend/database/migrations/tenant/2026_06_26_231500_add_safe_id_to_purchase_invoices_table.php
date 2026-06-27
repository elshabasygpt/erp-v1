<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->table('purchase_invoices', function (Blueprint $table) {
            if (! Schema::hasColumn('purchase_invoices', 'safe_id')) {
                $table->uuid('safe_id')->nullable()->after('payment_status');
                $table->foreign('safe_id')->references('id')->on('safes')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->table('purchase_invoices', function (Blueprint $table) {
            if (Schema::hasColumn('purchase_invoices', 'safe_id')) {
                $table->dropForeign(['safe_id']);
                $table->dropColumn('safe_id');
            }
        });
    }
};
