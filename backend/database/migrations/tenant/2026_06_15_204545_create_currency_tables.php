<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->create('currencies', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('code', 3); // USD, EUR, EGP
            $table->string('name');
            $table->string('symbol', 10)->nullable();
            $table->boolean('is_base')->default(false);
            $table->boolean('is_active')->default(true);
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::connection('tenant')->create('exchange_rates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('currency_id')->index();
            $table->decimal('rate', 18, 6); // Rate against base currency (e.g. 1 USD = 50 EGP, if EGP is base, USD rate is 50.000000)
            $table->date('date');
            $table->uuid('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();
            
            $table->unique(['tenant_id', 'currency_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('exchange_rates');
        Schema::connection('tenant')->dropIfExists('currencies');
    }
};
