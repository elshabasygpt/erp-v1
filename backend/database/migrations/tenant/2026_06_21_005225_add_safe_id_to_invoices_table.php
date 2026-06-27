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
        Schema::table('invoices', function (Blueprint $table) {
            if (!Schema::hasColumn('invoices', 'safe_id')) {
                $table->uuid('safe_id')->nullable()->after('salesperson_id');
                $table->foreign('safe_id')->references('id')->on('safes')->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            if (Schema::hasColumn('invoices', 'safe_id')) {
                $table->dropForeign(['safe_id']);
                $table->dropColumn('safe_id');
            }
        });
    }
};
