<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->table('sales_returns', function (Blueprint $table) {
            $table->uuid('rma_request_id')->nullable()->after('rma_number')->index();
        });

        Schema::connection('tenant')->table('customer_core_returns', function (Blueprint $table) {
            $table->uuid('rma_request_id')->nullable()->after('credit_note_id')->index();
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->table('sales_returns', function (Blueprint $table) {
            $table->dropColumn('rma_request_id');
        });

        Schema::connection('tenant')->table('customer_core_returns', function (Blueprint $table) {
            $table->dropColumn('rma_request_id');
        });
    }
};
