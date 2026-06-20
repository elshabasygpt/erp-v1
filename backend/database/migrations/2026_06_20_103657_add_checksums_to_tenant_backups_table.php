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
        Schema::table('tenant_backups', function (Blueprint $table) {
            $table->string('db_hash')->nullable()->after('db_dump_path');
            $table->string('files_hash')->nullable()->after('files_archive_path');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenant_backups', function (Blueprint $table) {
            $table->dropColumn(['db_hash', 'files_hash']);
        });
    }
};
