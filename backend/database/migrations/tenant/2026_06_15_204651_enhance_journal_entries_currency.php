<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->table('journal_entries', function (Blueprint $table) {
            $table->uuid('transaction_currency_id')->nullable()->after('date');
            $table->decimal('exchange_rate', 18, 6)->default(1.0)->after('transaction_currency_id');
        });

        Schema::connection('tenant')->table('journal_entry_lines', function (Blueprint $table) {
            $table->decimal('transaction_debit', 18, 6)->default(0.0)->after('credit');
            $table->decimal('transaction_credit', 18, 6)->default(0.0)->after('transaction_debit');
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->table('journal_entry_lines', function (Blueprint $table) {
            $table->dropColumn(['transaction_debit', 'transaction_credit']);
        });

        Schema::connection('tenant')->table('journal_entries', function (Blueprint $table) {
            $table->dropColumn(['transaction_currency_id', 'exchange_rate']);
        });
    }
};
