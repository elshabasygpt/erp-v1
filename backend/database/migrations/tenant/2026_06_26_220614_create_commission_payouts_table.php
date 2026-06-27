<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->create('commission_payouts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('salesperson_id');
            $table->decimal('total_amount', 14, 2);
            $table->date('payout_date');
            $table->uuid('safe_id')->nullable();
            $table->text('notes')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('salesperson_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('safe_id')->references('id')->on('safes')->onDelete('set null');
            $table->index('tenant_id');
        });

        Schema::connection('tenant')->table('invoices', function (Blueprint $table) {
            $table->timestamp('commission_paid_at')->nullable()->after('commission_amount');
            $table->uuid('commission_payout_id')->nullable()->after('commission_paid_at');
            $table->foreign('commission_payout_id')->references('id')->on('commission_payouts')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->table('invoices', function (Blueprint $table) {
            $table->dropForeign(['commission_payout_id']);
            $table->dropColumn(['commission_paid_at', 'commission_payout_id']);
        });

        Schema::connection('tenant')->dropIfExists('commission_payouts');
    }
};
