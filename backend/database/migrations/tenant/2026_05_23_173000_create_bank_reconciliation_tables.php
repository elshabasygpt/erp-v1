<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->create('bank_accounts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('account_number')->nullable();
            $table->string('bank_name')->nullable();
            $table->uuid('currency_id')->nullable();
            $table->decimal('opening_balance', 15, 2)->default(0);
            $table->decimal('current_balance', 15, 2)->default(0);
            $table->uuid('chart_of_account_id')->nullable(); // Link to accounts table
            $table->boolean('is_active')->default(true);
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::connection('tenant')->create('bank_transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('bank_account_id');
            $table->date('transaction_date');
            $table->enum('type', ['deposit', 'withdrawal', 'fee', 'interest']);
            $table->decimal('amount', 15, 2);
            $table->string('description')->nullable();
            $table->string('reference_number')->nullable();
            $table->boolean('is_reconciled')->default(false);
            $table->uuid('reconciliation_id')->nullable();
            $table->uuid('journal_entry_id')->nullable(); // To link with GL
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('bank_account_id')->references('id')->on('bank_accounts')->onDelete('cascade');
        });

        Schema::connection('tenant')->create('reconciliations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('bank_account_id');
            $table->date('statement_date');
            $table->date('start_date');
            $table->date('end_date');
            $table->decimal('statement_balance', 15, 2);
            $table->decimal('system_balance', 15, 2);
            $table->decimal('difference', 15, 2);
            $table->enum('status', ['draft', 'completed'])->default('draft');
            $table->uuid('created_by')->nullable();
            $table->uuid('completed_by')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('bank_account_id')->references('id')->on('bank_accounts')->onDelete('cascade');
        });

        Schema::connection('tenant')->create('reconciliation_lines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('reconciliation_id');
            $table->uuid('bank_transaction_id')->nullable();
            $table->uuid('journal_entry_line_id')->nullable();
            $table->enum('status', ['matched', 'unmatched', 'adjustment']);
            $table->timestamps();

            $table->foreign('reconciliation_id')->references('id')->on('reconciliations')->onDelete('cascade');
            $table->foreign('bank_transaction_id')->references('id')->on('bank_transactions')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('reconciliation_lines');
        Schema::connection('tenant')->dropIfExists('reconciliations');
        Schema::connection('tenant')->dropIfExists('bank_transactions');
        Schema::connection('tenant')->dropIfExists('bank_accounts');
    }
};
