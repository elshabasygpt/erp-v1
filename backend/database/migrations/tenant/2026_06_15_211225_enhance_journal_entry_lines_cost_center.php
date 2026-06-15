<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->table('journal_entry_lines', function (Blueprint $table) {
            $table->uuid('cost_center_id')->nullable()->after('account_id');
            $table->uuid('project_id')->nullable()->after('cost_center_id'); // Future-ready
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->table('journal_entry_lines', function (Blueprint $table) {
            $table->dropColumn(['cost_center_id', 'project_id']);
        });
    }
};
