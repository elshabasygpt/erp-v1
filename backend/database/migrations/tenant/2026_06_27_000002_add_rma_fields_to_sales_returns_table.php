<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->table('sales_returns', function (Blueprint $table) {
            $table->string('rma_number', 30)->nullable()->unique()->after('return_number')
                ->comment('Auto-generated RMA reference shown to the customer');
            $table->string('defect_type', 30)->nullable()->after('reason')
                ->comment('manufacturing | installation | shipping | other');
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->table('sales_returns', function (Blueprint $table) {
            $table->dropColumn(['rma_number', 'defect_type']);
        });
    }
};
