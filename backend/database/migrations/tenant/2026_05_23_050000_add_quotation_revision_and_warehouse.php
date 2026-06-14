<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->table('quotations', function (Blueprint $table) {
            $table->uuid('parent_id')->nullable()->after('id')->comment('For revision history');
            $table->integer('revision_number')->default(1)->after('parent_id');
            $table->uuid('warehouse_id')->nullable()->after('customer_id');

            $table->foreign('parent_id')->references('id')->on('quotations')->onDelete('set null');
            $table->foreign('warehouse_id')->references('id')->on('warehouses')->onDelete('restrict');
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->table('quotations', function (Blueprint $table) {
            $table->dropForeign(['parent_id']);
            $table->dropForeign(['warehouse_id']);
            $table->dropColumn(['parent_id', 'revision_number', 'warehouse_id']);
        });
    }
};
