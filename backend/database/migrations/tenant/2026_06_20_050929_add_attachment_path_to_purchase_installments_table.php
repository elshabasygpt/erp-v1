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
        Schema::connection('tenant')->table('purchase_installments', function (Blueprint $table) {
            $table->string('attachment_path')->nullable()->after('status');
            $table->string('payment_method')->nullable()->after('attachment_path'); // e.g. bank_transfer, cash
            $table->dateTime('payment_date')->nullable()->after('payment_method');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('tenant')->table('purchase_installments', function (Blueprint $table) {
            $table->dropColumn(['attachment_path', 'payment_method', 'payment_date']);
        });
    }
};
