<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales_channel_types', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        // Insert default types
        DB::table('sales_channel_types')->insert([
            ['id' => Str::uuid(), 'name' => 'Delivery App', 'created_at' => now(), 'updated_at' => now()],
            ['id' => Str::uuid(), 'name' => 'Internal Delivery', 'created_at' => now(), 'updated_at' => now()],
            ['id' => Str::uuid(), 'name' => 'Marketplace', 'created_at' => now(), 'updated_at' => now()],
            ['id' => Str::uuid(), 'name' => 'Custom', 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('sales_channel_types');
    }
};
