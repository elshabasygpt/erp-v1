<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::connection('tenant')->hasTable('invoice_items')) {
            return;
        }

        Schema::connection('tenant')->table('invoice_items', function (Blueprint $table) {
            if (! Schema::connection('tenant')->hasColumn('invoice_items', 'subtotal')) {
                $table->decimal('subtotal', 14, 2)->default(0)->after('quantity');
            }
            if (! Schema::connection('tenant')->hasColumn('invoice_items', 'tax_amount')) {
                $table->decimal('tax_amount', 14, 2)->default(0)->after('subtotal');
            }
        });

        // Back-fill from existing data: subtotal = quantity * unit_price, tax_amount = 0
        DB::connection('tenant')->statement(
            "UPDATE invoice_items SET subtotal = quantity * unit_price WHERE subtotal = 0"
        );
    }

    public function down(): void
    {
        if (! Schema::connection('tenant')->hasTable('invoice_items')) {
            return;
        }

        Schema::connection('tenant')->table('invoice_items', function (Blueprint $table) {
            $drops = [];
            if (Schema::connection('tenant')->hasColumn('invoice_items', 'subtotal')) {
                $drops[] = 'subtotal';
            }
            if (Schema::connection('tenant')->hasColumn('invoice_items', 'tax_amount')) {
                $drops[] = 'tax_amount';
            }
            if ($drops) {
                $table->dropColumn($drops);
            }
        });
    }
};
