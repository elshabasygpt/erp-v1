<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Enforce at most one open shift per user per tenant at the database level.
        // A partial unique index on status='open' allows many closed shifts for the
        // same user while making a duplicate-open impossible even under concurrent requests.
        DB::connection('tenant')->statement(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_one_open_shift_per_user
             ON pos_shifts (tenant_id, user_id)
             WHERE status = 'open'"
        );
    }

    public function down(): void
    {
        DB::connection('tenant')->statement(
            'DROP INDEX IF EXISTS uq_one_open_shift_per_user'
        );
    }
};
