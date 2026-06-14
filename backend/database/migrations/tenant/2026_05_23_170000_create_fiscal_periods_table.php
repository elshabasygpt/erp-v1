<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->create('fiscal_periods', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name'); // e.g. "January 2026", "Q1 2026"
            $table->date('start_date');
            $table->date('end_date');
            $table->enum('status', ['open', 'closed', 'locked'])->default('open');
            $table->uuid('closed_by')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->uuid('reopened_by')->nullable();
            $table->timestamp('reopened_at')->nullable();
            $table->text('close_notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['start_date', 'end_date']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('fiscal_periods');
    }
};
