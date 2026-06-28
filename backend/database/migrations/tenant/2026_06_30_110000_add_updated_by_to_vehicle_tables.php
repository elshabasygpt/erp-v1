<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds `updated_by` to the vehicle-compatibility tables. The columns are declared
 * in VehicleMakeModel / VehicleModelModel / VehicleYearModel $fillable but were
 * never created, so writing the "who last edited" audit value errored on Postgres
 * / was silently dropped.
 */
return new class extends Migration
{
    private array $tables = ['vehicle_makes', 'vehicle_models', 'vehicle_years'];

    public function up(): void
    {
        foreach ($this->tables as $table) {
            if (Schema::connection('tenant')->hasTable($table)
                && ! Schema::connection('tenant')->hasColumn($table, 'updated_by')) {
                Schema::connection('tenant')->table($table, function (Blueprint $t) {
                    $t->uuid('updated_by')->nullable()->after('created_by');
                });
            }
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $table) {
            if (Schema::connection('tenant')->hasColumn($table, 'updated_by')) {
                Schema::connection('tenant')->table($table, function (Blueprint $t) {
                    $t->dropColumn('updated_by');
                });
            }
        }
    }
};
