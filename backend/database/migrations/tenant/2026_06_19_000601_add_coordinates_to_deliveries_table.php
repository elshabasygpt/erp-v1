<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->table('deliveries', function (Blueprint $table) {
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();
            $table->text('delivery_address_text')->nullable();
            $table->uuid('delivery_route_id')->nullable();
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->table('deliveries', function (Blueprint $table) {
            $table->dropColumn(['latitude', 'longitude', 'delivery_address_text', 'delivery_route_id']);
        });
    }
};
