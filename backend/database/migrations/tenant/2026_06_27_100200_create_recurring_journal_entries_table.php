<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->create('recurring_journal_entries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id');
            $table->string('name');
            $table->text('description')->nullable();
            $table->enum('frequency', ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']);
            $table->integer('frequency_interval')->default(1); // e.g. every 2 months
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->date('next_post_date');
            $table->date('last_posted_date')->nullable();
            $table->boolean('auto_post')->default(false); // post immediately or save as draft
            $table->boolean('is_active')->default(true);
            $table->integer('occurrences_posted')->default(0);
            $table->integer('max_occurrences')->nullable();
            $table->string('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'next_post_date', 'is_active']);
        });

        Schema::connection('tenant')->create('recurring_journal_entry_lines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('recurring_journal_entry_id');
            $table->string('tenant_id');
            $table->uuid('account_id');
            $table->decimal('debit', 14, 6)->default(0);
            $table->decimal('credit', 14, 6)->default(0);
            $table->string('description')->nullable();
            $table->uuid('cost_center_id')->nullable();
            $table->timestamps();

            $table->foreign('recurring_journal_entry_id')
                ->references('id')->on('recurring_journal_entries')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('recurring_journal_entry_lines');
        Schema::connection('tenant')->dropIfExists('recurring_journal_entries');
    }
};
