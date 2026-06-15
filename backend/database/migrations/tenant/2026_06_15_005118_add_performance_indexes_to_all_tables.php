<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Partners table
        if (Schema::hasTable('partners')) {
            Schema::table('partners', function (Blueprint $table) {
                if (Schema::hasColumn('partners', 'tenant_id') && !$this->indexExists('partners', 'partners_tenant_id_index')) { $table->index('tenant_id'); }
                if (Schema::hasColumn('partners', 'status') && !$this->indexExists('partners', 'partners_status_index')) { $table->index('status'); }
            });
        }

        // Profit distributions
        if (Schema::hasTable('profit_distributions')) {
            Schema::table('profit_distributions', function (Blueprint $table) {
                if (Schema::hasColumn('profit_distributions', 'tenant_id') && !$this->indexExists('profit_distributions', 'profit_distributions_tenant_id_index')) { $table->index('tenant_id'); }
                if (Schema::hasColumn('profit_distributions', 'period_start') && Schema::hasColumn('profit_distributions', 'period_end') && !$this->indexExists('profit_distributions', 'profit_distributions_period_index')) { $table->index(['period_start', 'period_end']); }
            });
        }

        // Approval requests
        if (Schema::hasTable('approval_requests')) {
            Schema::table('approval_requests', function (Blueprint $table) {
                if (Schema::hasColumn('approval_requests', 'tenant_id') && Schema::hasColumn('approval_requests', 'status') && !$this->indexExists('approval_requests', 'approval_requests_tenant_status_index')) { $table->index(['tenant_id', 'status']); }
                if (Schema::hasColumn('approval_requests', 'assigned_to') && !$this->indexExists('approval_requests', 'approval_requests_assigned_to_index')) { $table->index('assigned_to'); }
            });
        }

        // Deliveries
        if (Schema::hasTable('deliveries')) {
            Schema::table('deliveries', function (Blueprint $table) {
                if (Schema::hasColumn('deliveries', 'tenant_id') && !$this->indexExists('deliveries', 'deliveries_tenant_id_index')) { $table->index('tenant_id'); }
                if (Schema::hasColumn('deliveries', 'status') && !$this->indexExists('deliveries', 'deliveries_status_index')) { $table->index('status'); }
            });
        }

        // Sales orders
        if (Schema::hasTable('sales_orders')) {
            Schema::table('sales_orders', function (Blueprint $table) {
                if (Schema::hasColumn('sales_orders', 'tenant_id') && Schema::hasColumn('sales_orders', 'status') && !$this->indexExists('sales_orders', 'sales_orders_tenant_status_index')) { $table->index(['tenant_id', 'status']); }
            });
        }

        // Sales channels
        if (Schema::hasTable('sales_channels')) {
            Schema::table('sales_channels', function (Blueprint $table) {
                if (Schema::hasColumn('sales_channels', 'tenant_id') && !$this->indexExists('sales_channels', 'sales_channels_tenant_id_index')) { $table->index('tenant_id'); }
            });
        }

        // Bank accounts
        if (Schema::hasTable('bank_accounts')) {
            Schema::table('bank_accounts', function (Blueprint $table) {
                if (Schema::hasColumn('bank_accounts', 'tenant_id') && !$this->indexExists('bank_accounts', 'bank_accounts_tenant_id_index')) { $table->index('tenant_id'); }
            });
        }

        // Stock ledgers
        if (Schema::hasTable('stock_ledgers')) {
            Schema::table('stock_ledgers', function (Blueprint $table) {
                if (Schema::hasColumn('stock_ledgers', 'product_id') && !$this->indexExists('stock_ledgers', 'stock_ledgers_product_id_index')) { $table->index('product_id'); }
                if (Schema::hasColumn('stock_ledgers', 'warehouse_id') && !$this->indexExists('stock_ledgers', 'stock_ledgers_warehouse_id_index')) { $table->index('warehouse_id'); }
                if (Schema::hasColumn('stock_ledgers', 'created_at') && !$this->indexExists('stock_ledgers', 'stock_ledgers_created_at_index')) { $table->index('created_at'); }
            });
        }

        // Tenant settings (ZATCA + config)
        if (Schema::hasTable('tenant_settings')) {
            Schema::table('tenant_settings', function (Blueprint $table) {
                if (Schema::hasColumn('tenant_settings', 'key') && !$this->indexExists('tenant_settings', 'tenant_settings_key_index')) { $table->index('key'); }
            });
        }
    }

    public function down(): void
    {
        $tables = [
            'partners'             => ['tenant_id', 'status'],
            'profit_distributions' => ['tenant_id'],
            'approval_requests'    => ['tenant_id', 'assigned_to'],
            'deliveries'           => ['tenant_id', 'status'],
            'sales_orders'         => ['tenant_id'],
            'sales_channels'       => ['tenant_id'],
            'bank_accounts'        => ['tenant_id'],
            'stock_ledgers'        => ['product_id', 'warehouse_id', 'created_at'],
            'tenant_settings'      => ['key'],
        ];

        foreach ($tables as $table => $columns) {
            if (Schema::hasTable($table)) {
                Schema::table($table, function (Blueprint $blueprint) use ($columns) {
                    foreach ($columns as $col) {
                        try { $blueprint->dropIndex([$col]); } catch (\Exception $e) {}
                    }
                });
            }
        }
    }

    private function indexExists(string $table, string $indexName): bool
    {
        $driver = \DB::connection()->getDriverName();
        if ($driver === 'sqlite') {
            return collect(\DB::select("
                SELECT name FROM sqlite_master
                WHERE type = 'index' AND tbl_name = ? AND name = ?
            ", [$table, $indexName]))->isNotEmpty();
        }

        return collect(\DB::select("
            SELECT indexname FROM pg_indexes
            WHERE tablename = ? AND indexname = ?
        ", [$table, $indexName]))->isNotEmpty();
    }
};

