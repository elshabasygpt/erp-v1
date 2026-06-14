<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->table('sales_returns', function (Blueprint $table) {
            $table->string('return_type')->default('full')->after('status'); // full, partial, line_return
            $table->string('refund_method')->default('store_credit')->after('return_type'); // store_credit, cash, card, bank_transfer
            $table->string('reason')->nullable()->after('refund_method');
            $table->string('approval_status')->default('approved')->after('reason'); // pending, approved, rejected
        });

        Schema::connection('tenant')->table('sales_return_items', function (Blueprint $table) {
            $table->string('condition')->default('good')->after('total'); // good, damaged
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->table('sales_returns', function (Blueprint $table) {
            $table->dropColumn(['return_type', 'refund_method', 'reason', 'approval_status']);
        });

        Schema::connection('tenant')->table('sales_return_items', function (Blueprint $table) {
            $table->dropColumn('condition');
        });
    }
};
