<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->table('customers', function (Blueprint $table) {
            $table->integer('loyalty_points')->default(0)->after('balance');
            $table->string('segment')->nullable()->after('loyalty_points');
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->table('customers', function (Blueprint $table) {
            $table->dropColumn(['loyalty_points', 'segment']);
        });
    }
};
