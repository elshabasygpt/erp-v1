<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $changes = [
            'products'       => ['image_url'],
            'categories'     => ['image_url'],
            'brands'         => ['image_url'],
            'vehicle_models' => ['image_url'],
            'vehicle_years'  => ['engine_image_url'],
        ];

        foreach ($changes as $table => $columns) {
            if (! Schema::connection('tenant')->hasTable($table)) {
                continue;
            }
            foreach ($columns as $column) {
                if (Schema::connection('tenant')->hasColumn($table, $column)) {
                    Schema::connection('tenant')->table($table, function (Blueprint $t) use ($column) {
                        $t->text($column)->nullable()->change();
                    });
                }
            }
        }
    }

    public function down(): void
    {
        $changes = [
            'products'       => ['image_url'],
            'categories'     => ['image_url'],
            'brands'         => ['image_url'],
            'vehicle_models' => ['image_url'],
            'vehicle_years'  => ['engine_image_url'],
        ];

        foreach ($changes as $table => $columns) {
            if (! Schema::connection('tenant')->hasTable($table)) {
                continue;
            }
            foreach ($columns as $column) {
                if (Schema::connection('tenant')->hasColumn($table, $column)) {
                    Schema::connection('tenant')->table($table, function (Blueprint $t) use ($column) {
                        $t->string($column, 255)->nullable()->change();
                    });
                }
            }
        }
    }
};
