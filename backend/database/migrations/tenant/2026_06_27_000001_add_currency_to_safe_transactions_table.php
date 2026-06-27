<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->table('safe_transactions', function (Blueprint $table) {
            $table->uuid('currency_id')->nullable()->after('amount');
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->table('safe_transactions', function (Blueprint $table) {
            $table->dropColumn('currency_id');
        });
    }
};
