<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'tenant';

    public function up(): void
    {
        Schema::connection('tenant')->table('brands', function (Blueprint $table) {
            $table->string('country_of_origin', 100)->nullable()->after('image_url');
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->table('brands', function (Blueprint $table) {
            $table->dropColumn('country_of_origin');
        });
    }
};
