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
        Schema::connection('tenant')->table('data_imports', function (Blueprint $table) {
            $table->integer('imported_rows')->default(0)->after('processed_rows');
            $table->integer('updated_rows')->default(0)->after('imported_rows');
            $table->integer('skipped_rows')->default(0)->after('updated_rows');
            $table->string('ip_address', 45)->nullable()->after('error_message');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('tenant')->table('data_imports', function (Blueprint $table) {
            $table->dropColumn(['imported_rows', 'updated_rows', 'skipped_rows', 'ip_address']);
        });
    }
};
