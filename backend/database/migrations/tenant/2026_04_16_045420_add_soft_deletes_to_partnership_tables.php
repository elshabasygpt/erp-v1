<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add missing soft delete columns to partnership tables.
     * The BaseModel uses SoftDeletes trait which requires deleted_at.
     */
    public function up(): void
    {
        // profit_distributions - missing deleted_at
        Schema::connection('tenant')->table('profit_distributions', function (Blueprint $table) {
            $table->softDeletes();
        });

        // partner_profit_shares - missing deleted_at
        Schema::connection('tenant')->table('partner_profit_shares', function (Blueprint $table) {
            $table->softDeletes();
        });

        // partner_withdrawals - missing deleted_at
        Schema::connection('tenant')->table('partner_withdrawals', function (Blueprint $table) {
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->table('profit_distributions', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
        Schema::connection('tenant')->table('partner_profit_shares', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
        Schema::connection('tenant')->table('partner_withdrawals', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};
