<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $connection = Schema::connection('tenant');
        $tables = array_map(function ($t) { return $t->name; }, DB::connection('tenant')->select("SELECT name FROM sqlite_master WHERE type='table'"));

        foreach ($tables as $table) {
            if ($table === 'migrations' || $table === 'sqlite_sequence') {
                continue;
            }

            if (!$connection->hasColumn($table, 'tenant_id')) {
                $connection->table($table, function (Blueprint $blueprint) {
                    $blueprint->uuid('tenant_id')->default('00000000-0000-0000-0000-000000000001')->after('id');
                });
            }
        }
    }

    public function down(): void
    {
        $connection = Schema::connection('tenant');
        $tables = array_map(function ($t) { return $t->name; }, DB::connection('tenant')->select("SELECT name FROM sqlite_master WHERE type='table'"));

        foreach ($tables as $table) {
            if ($table === 'migrations' || $table === 'sqlite_sequence') {
                continue;
            }

            if ($connection->hasColumn($table, 'tenant_id')) {
                $connection->table($table, function (Blueprint $blueprint) {
                    $blueprint->dropColumn('tenant_id');
                });
            }
        }
    }
};
