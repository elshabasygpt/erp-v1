<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->table('partners', function (Blueprint $table) {
            $table->string('duration_type')->default('open')->after('profit_share_percentage'); // 'open', 'days', 'months', 'years'
            $table->integer('duration_value')->nullable()->after('duration_type');
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->table('partners', function (Blueprint $table) {
            $table->dropColumn(['duration_type', 'duration_value']);
        });
    }
};
