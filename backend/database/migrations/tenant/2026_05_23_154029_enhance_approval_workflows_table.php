<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->table('approval_requests', function (Blueprint $table) {
            $table->uuid('rule_id')->nullable()->after('id');
            $table->timestamp('escalated_at')->nullable()->after('resolved_by');
        });

        Schema::connection('tenant')->create('approval_audit_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('approval_request_id');
            $table->uuid('user_id')->nullable();
            $table->string('action'); // e.g. approved, rejected, escalated, unauthorized_bypass_attempt
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
            
            $table->index('approval_request_id');
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->dropIfExists('approval_audit_logs');

        Schema::connection('tenant')->table('approval_requests', function (Blueprint $table) {
            $table->dropColumn(['rule_id', 'escalated_at']);
        });
    }
};
