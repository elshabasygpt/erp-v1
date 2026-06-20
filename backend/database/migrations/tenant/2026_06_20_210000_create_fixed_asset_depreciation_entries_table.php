<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->table('fixed_assets', function (Blueprint $table) {
            $table->uuid('depreciation_account_id')->nullable()->after('account_id');
            $table->uuid('expense_account_id')->nullable()->after('depreciation_account_id');

            $table->foreign('depreciation_account_id')->references('id')->on('accounts')->onDelete('set null');
            $table->foreign('expense_account_id')->references('id')->on('accounts')->onDelete('set null');
        });

        Schema::connection('tenant')->create('fixed_asset_depreciation_entries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable();
            $table->uuid('fixed_asset_id');
            $table->uuid('journal_entry_id');
            $table->date('period_start');
            $table->date('period_end');
            $table->decimal('amount', 14, 2);
            $table->decimal('accumulated_after', 14, 2);
            $table->decimal('book_value_after', 14, 2);
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('fixed_asset_id')->references('id')->on('fixed_assets')->onDelete('cascade');
            $table->foreign('journal_entry_id')->references('id')->on('journal_entries')->onDelete('cascade');
            $table->index(['fixed_asset_id', 'period_end']);
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('fixed_asset_depreciation_entries');

        Schema::connection('tenant')->table('fixed_assets', function (Blueprint $table) {
            $table->dropForeign(['depreciation_account_id']);
            $table->dropForeign(['expense_account_id']);
            $table->dropColumn(['depreciation_account_id', 'expense_account_id']);
        });
    }
};
