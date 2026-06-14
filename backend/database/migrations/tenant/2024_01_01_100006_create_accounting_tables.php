<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Chart of Accounts
        Schema::connection('tenant')->create('accounts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code')->unique();
            $table->string('name');
            $table->string('name_ar');
            $table->enum('type', ['asset', 'liability', 'equity', 'revenue', 'expense']);
            $table->uuid('parent_id')->nullable();
            $table->boolean('is_active')->default(true);
            $table->text('description')->nullable();
            $table->integer('level')->default(1);
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('code');
            $table->index('type');
        });

        Schema::connection('tenant')->table('accounts', function (Blueprint $table) {
            $table->foreign('parent_id')->references('id')->on('accounts')->onDelete('restrict');
        });

        // Journal Entries
        Schema::connection('tenant')->create('journal_entries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('entry_number')->unique();
            $table->date('date');
            $table->text('description');
            $table->boolean('is_posted')->default(false);
            $table->string('reference_type')->nullable();
            $table->uuid('reference_id')->nullable();
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('date');
            $table->index('is_posted');
            $table->index(['reference_type', 'reference_id']);
        });

        // Journal Entry Lines
        Schema::connection('tenant')->create('journal_entry_lines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('journal_entry_id');
            $table->uuid('account_id');
            $table->decimal('debit', 14, 2)->default(0);
            $table->decimal('credit', 14, 2)->default(0);
            $table->text('description')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('journal_entry_id')->references('id')->on('journal_entries')->onDelete('cascade');
            $table->foreign('account_id')->references('id')->on('accounts')->onDelete('restrict');
            $table->index('account_id');
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('journal_entry_lines');
        Schema::connection('tenant')->dropIfExists('journal_entries');
        Schema::connection('tenant')->dropIfExists('accounts');
    }
};
