<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Create a Default Branch first if we are migrating existing data
        // We defer this until we actually have the connection in context. Usually done via a seeder or raw SQL.
        // For safety, we will just add the columns as nullable first, then we can seed a default branch, then update.

        // Users
        Schema::connection('tenant')->table('users', function (Blueprint $table) {
            $table->uuid('branch_id')->nullable()->after('id');
            $table->foreign('branch_id')->references('id')->on('branches')->onDelete('set null');
        });

        // Warehouses
        Schema::connection('tenant')->table('warehouses', function (Blueprint $table) {
            $table->uuid('branch_id')->nullable()->after('id');
            $table->foreign('branch_id')->references('id')->on('branches')->onDelete('cascade');
        });

        // Invoices (Sales)
        Schema::connection('tenant')->table('invoices', function (Blueprint $table) {
            $table->uuid('branch_id')->nullable()->after('id');
            $table->foreign('branch_id')->references('id')->on('branches')->onDelete('cascade');
        });

    }

    public function down(): void
    {
        Schema::connection('tenant')->table('invoices', function (Blueprint $table) {
            $table->dropForeign(['branch_id']);
            $table->dropColumn('branch_id');
        });

        Schema::connection('tenant')->table('warehouses', function (Blueprint $table) {
            $table->dropForeign(['branch_id']);
            $table->dropColumn('branch_id');
        });

        Schema::connection('tenant')->table('users', function (Blueprint $table) {
            $table->dropForeign(['branch_id']);
            $table->dropColumn('branch_id');
        });
    }
};
