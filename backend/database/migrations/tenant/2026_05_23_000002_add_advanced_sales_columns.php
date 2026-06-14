<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->table('invoices', function (Blueprint $table) {
            $table->timestamp('due_date')->nullable();
            $table->text('internal_notes')->nullable();
            $table->string('reference_no')->nullable();
            $table->decimal('paid_amount', 14, 2)->default(0);
            $table->uuid('salesperson_id')->nullable();
        });

        Schema::connection('tenant')->table('customers', function (Blueprint $table) {
            $table->decimal('credit_limit', 14, 2)->default(0);
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->table('invoices', function (Blueprint $table) {
            $table->dropColumn(['due_date', 'internal_notes', 'reference_no', 'paid_amount', 'salesperson_id']);
        });

        Schema::connection('tenant')->table('customers', function (Blueprint $table) {
            $table->dropColumn('credit_limit');
        });
    }
};
