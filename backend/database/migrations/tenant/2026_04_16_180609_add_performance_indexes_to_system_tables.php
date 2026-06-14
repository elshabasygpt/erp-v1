<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations — adds performance indexes safely (skips if already exist).
     */
    public function up(): void
    {
        $this->safeAddIndexes('products', [
            ['columns' => ['sku'],     'name' => 'products_sku_index'],
            ['columns' => ['barcode'], 'name' => 'products_barcode_index'],
        ]);

        $this->safeAddIndexes('invoices', [
            ['columns' => ['invoice_number'], 'name' => 'invoices_invoice_number_index'],
            ['columns' => ['customer_id'],    'name' => 'invoices_customer_id_index'],
            ['columns' => ['invoice_date'],   'name' => 'invoices_invoice_date_index'],
        ]);

        $this->safeAddIndexes('purchase_invoices', [
            ['columns' => ['invoice_number'], 'name' => 'purchase_invoices_invoice_number_index'],
            ['columns' => ['supplier_id'],    'name' => 'purchase_invoices_supplier_id_index'],
            ['columns' => ['invoice_date'],   'name' => 'purchase_invoices_invoice_date_index'],
        ]);

        $this->safeAddIndexes('customers', [
            ['columns' => ['phone'], 'name' => 'customers_phone_index'],
        ]);

        $this->safeAddIndexes('safe_transactions', [
            ['columns' => ['transaction_date'], 'name' => 'safe_transactions_transaction_date_index'],
            ['columns' => ['safe_id'],          'name' => 'safe_transactions_safe_id_index'],
        ]);
    }

    public function down(): void
    {
        Schema::connection('tenant')->table('products', function (Blueprint $table) {
            $table->dropIndexIfExists('products_sku_index');
            $table->dropIndexIfExists('products_barcode_index');
        });

        Schema::connection('tenant')->table('invoices', function (Blueprint $table) {
            $table->dropIndexIfExists('invoices_invoice_number_index');
            $table->dropIndexIfExists('invoices_customer_id_index');
            $table->dropIndexIfExists('invoices_invoice_date_index');
        });

        Schema::connection('tenant')->table('purchase_invoices', function (Blueprint $table) {
            $table->dropIndexIfExists('purchase_invoices_invoice_number_index');
            $table->dropIndexIfExists('purchase_invoices_supplier_id_index');
            $table->dropIndexIfExists('purchase_invoices_invoice_date_index');
        });

        Schema::connection('tenant')->table('customers', function (Blueprint $table) {
            $table->dropIndexIfExists('customers_phone_index');
        });

        Schema::connection('tenant')->table('safe_transactions', function (Blueprint $table) {
            $table->dropIndexIfExists('safe_transactions_transaction_date_index');
            $table->dropIndexIfExists('safe_transactions_safe_id_index');
        });
    }

    // ── Helper: add index only if it doesn't already exist ────────
    private function safeAddIndexes(string $table, array $indexes): void
    {
        Schema::connection('tenant')->table($table, function (Blueprint $blueprint) use ($table, $indexes) {
            foreach ($indexes as $idx) {
                if (!$this->indexExists($table, $idx['name'])) {
                    $blueprint->index($idx['columns'], $idx['name']);
                }
            }
        });
    }

    private function indexExists(string $table, string $indexName): bool
    {
        $driver = DB::connection('tenant')->getDriverName();
        if ($driver === 'sqlite') {
            $result = DB::connection('tenant')
                ->select("SELECT 1 FROM sqlite_master WHERE type = 'index' AND name = ?", [$indexName]);
            return !empty($result);
        }

        $result = DB::connection('tenant')
            ->select("SELECT 1 FROM pg_indexes WHERE tablename = ? AND indexname = ?", [$table, $indexName]);
        return !empty($result);
    }
};
