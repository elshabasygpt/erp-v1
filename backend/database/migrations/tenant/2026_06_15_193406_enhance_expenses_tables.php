<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->table('expense_categories', function (Blueprint $table) {
            $table->uuid('account_id')->nullable()->after('name_ar');
        });

        Schema::connection('tenant')->table('expenses', function (Blueprint $table) {
            $table->string('voucher_number')->nullable()->after('tenant_id')->index();
            $table->string('status')->default('draft')->after('amount'); // draft, approved, paid, cancelled
            $table->uuid('approved_by')->nullable()->after('created_by');
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->table('expenses', function (Blueprint $table) {
            $table->dropColumn(['voucher_number', 'status', 'approved_by']);
        });

        Schema::connection('tenant')->table('expense_categories', function (Blueprint $table) {
            $table->dropColumn('account_id');
        });
    }
};
