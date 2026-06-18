<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('tenant')->table('inventory_stocktakes', function (Blueprint $table) {
            $table->enum('type', ['full', 'partial', 'cycle'])->default('full')->after('category_id');
            $table->boolean('is_blind')->default(false)->after('type');
            $table->boolean('is_frozen')->default(false)->after('is_blind');
            $table->uuid('approved_by')->nullable()->after('created_by');
        });

        Schema::connection('tenant')->table('inventory_stocktake_items', function (Blueprint $table) {
            $table->uuid('counted_by')->nullable()->after('notes');
            $table->boolean('is_recounted')->default(false)->after('counted_by');
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->table('inventory_stocktakes', function (Blueprint $table) {
            $table->dropColumn(['type', 'is_blind', 'is_frozen', 'approved_by']);
        });

        Schema::connection('tenant')->table('inventory_stocktake_items', function (Blueprint $table) {
            $table->dropColumn(['counted_by', 'is_recounted']);
        });
    }
};
