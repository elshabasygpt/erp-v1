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
        // imported_rows, updated_rows, skipped_rows, and ip_address are already
        // added by the 2026_06_21_020949_add_audit_columns_to_data_imports migration.
        Schema::connection('tenant')->table('data_imports', function (Blueprint $table) {
            $table->integer('failed_row_count')->default(0)->after('skipped_rows');
            $table->integer('duration')->default(0)->after('failed_row_count')->comment('Execution time in seconds');
            $table->uuid('rollback_id')->nullable()->after('ip_address');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('tenant')->table('data_imports', function (Blueprint $table) {
            $table->dropColumn([
                'failed_row_count',
                'duration',
                'rollback_id',
            ]);
        });
    }
};
