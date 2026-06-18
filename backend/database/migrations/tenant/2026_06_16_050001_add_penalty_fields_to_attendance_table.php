<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->table('employee_attendances', function (Blueprint $table) {
            if (!Schema::connection('tenant')->hasColumn('employee_attendances', 'grace_minutes_applied')) {
                $table->unsignedSmallInteger('grace_minutes_applied')->default(0)->after('late_minutes');
            }
            if (!Schema::connection('tenant')->hasColumn('employee_attendances', 'penalty_amount')) {
                $table->decimal('penalty_amount', 10, 2)->default(0)->after('grace_minutes_applied');
            }
            if (!Schema::connection('tenant')->hasColumn('employee_attendances', 'penalty_rule_label')) {
                $table->string('penalty_rule_label')->nullable()->after('penalty_amount');
            }
            if (!Schema::connection('tenant')->hasColumn('employee_attendances', 'notification_sent')) {
                $table->boolean('notification_sent')->default(false)->after('penalty_rule_label');
            }
            if (!Schema::connection('tenant')->hasColumn('employee_attendances', 'notification_sent_at')) {
                $table->timestamp('notification_sent_at')->nullable()->after('notification_sent');
            }
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->table('employee_attendances', function (Blueprint $table) {
            $table->dropColumn([
                'grace_minutes_applied',
                'penalty_amount',
                'penalty_rule_label',
                'notification_sent',
                'notification_sent_at'
            ]);
        });
    }
};
