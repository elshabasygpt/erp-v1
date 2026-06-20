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
        Schema::connection('tenant')->table('purchase_requests', function (Blueprint $table) {
            $table->uuid('suggested_supplier_id')->nullable()->after('tenant_id');
            $table->foreign('suggested_supplier_id')->references('id')->on('suppliers')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('tenant')->table('purchase_requests', function (Blueprint $table) {
            $table->dropForeign(['suggested_supplier_id']);
            $table->dropColumn('suggested_supplier_id');
        });
    }
};
