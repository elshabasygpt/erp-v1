<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Adds the payment-tracking columns that purchase_invoices was always assumed to
 * have (they appear in PurchaseInvoiceModel::$fillable and are referenced by the
 * supplier aging report, the installment-payment flow, and FinancialReportsController)
 * but were never actually created by any migration.
 *
 * Without these columns:
 *   - GET /crm/payables/aging  → PostgreSQL "column does not exist" → 500 → page always empty
 *   - PurchaseController installment payment → $invoice->increment('paid_amount') → fails
 *
 * This migration adds the columns and backfills existing rows from the
 * purchase_installments table (the only reliable source of historical paid amounts).
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── 1. Add the missing columns (guarded so the migration is safe to re-run) ──
        Schema::connection('tenant')->table('purchase_invoices', function (Blueprint $table) {
            if (! Schema::connection('tenant')->hasColumn('purchase_invoices', 'paid_amount')) {
                // match the precision of `total` (decimal 14,2)
                $table->decimal('paid_amount', 14, 2)->default(0)->after('total');
            }
            if (! Schema::connection('tenant')->hasColumn('purchase_invoices', 'due_date')) {
                $table->date('due_date')->nullable()->after('invoice_date');
            }
            if (! Schema::connection('tenant')->hasColumn('purchase_invoices', 'payment_status')) {
                // values used across the codebase: 'unpaid' | 'partial' | 'paid'
                $table->string('payment_status', 20)->default('unpaid')->after('status');
            }
        });

        // Postgres and SQLite (test env) need different back-fill SQL: Postgres
        // supports the efficient `UPDATE ... FROM` and `::date` cast; SQLite does
        // not, so it gets equivalent correlated subqueries and an un-cast column.
        $isPg = DB::connection('tenant')->getDriverName() === 'pgsql';

        // ── 2. Backfill paid_amount from confirmed installment payments ──
        // Invoices with no installments keep the default 0.
        if (Schema::connection('tenant')->hasTable('purchase_installments')) {
            if ($isPg) {
                DB::connection('tenant')->statement(<<<'SQL'
                    UPDATE purchase_invoices pi
                    SET paid_amount = COALESCE(s.total_paid, 0)
                    FROM (
                        SELECT purchase_invoice_id, SUM(paid_amount) AS total_paid
                        FROM purchase_installments
                        WHERE deleted_at IS NULL
                        GROUP BY purchase_invoice_id
                    ) s
                    WHERE s.purchase_invoice_id = pi.id
                SQL);
            } else {
                DB::connection('tenant')->statement(<<<'SQL'
                    UPDATE purchase_invoices
                    SET paid_amount = COALESCE((
                        SELECT SUM(pii.paid_amount)
                        FROM purchase_installments pii
                        WHERE pii.purchase_invoice_id = purchase_invoices.id
                          AND pii.deleted_at IS NULL
                    ), 0)
                SQL);
            }
        }

        // ── 3. Backfill due_date: earliest unpaid installment due date, else the invoice date ──
        $invoiceDateExpr = $isPg ? 'invoice_date::date' : 'invoice_date';
        if (Schema::connection('tenant')->hasTable('purchase_installments')) {
            DB::connection('tenant')->statement(<<<SQL
                UPDATE purchase_invoices
                SET due_date = COALESCE(
                    (
                        SELECT MIN(pii.due_date)
                        FROM purchase_installments pii
                        WHERE pii.purchase_invoice_id = purchase_invoices.id
                          AND pii.deleted_at IS NULL
                    ),
                    {$invoiceDateExpr}
                )
                WHERE due_date IS NULL
            SQL);
        } else {
            DB::connection('tenant')->statement(
                "UPDATE purchase_invoices SET due_date = {$invoiceDateExpr} WHERE due_date IS NULL"
            );
        }

        // ── 4. Backfill payment_status from paid_amount vs total (must run AFTER step 2) ──
        DB::connection('tenant')->statement(<<<'SQL'
            UPDATE purchase_invoices
            SET payment_status = CASE
                WHEN total > 0 AND paid_amount >= total THEN 'paid'
                WHEN paid_amount > 0                     THEN 'partial'
                ELSE 'unpaid'
            END
        SQL);

        // helpful index for the aging report's filter
        Schema::connection('tenant')->table('purchase_invoices', function (Blueprint $table) {
            if (! $this->indexExists('purchase_invoices', 'idx_pi_payment_status_due')) {
                $table->index(['tenant_id', 'payment_status', 'due_date'], 'idx_pi_payment_status_due');
            }
        });
    }

    public function down(): void
    {
        Schema::connection('tenant')->table('purchase_invoices', function (Blueprint $table) {
            if ($this->indexExists('purchase_invoices', 'idx_pi_payment_status_due')) {
                $table->dropIndex('idx_pi_payment_status_due');
            }
            foreach (['paid_amount', 'due_date', 'payment_status'] as $col) {
                if (Schema::connection('tenant')->hasColumn('purchase_invoices', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }

    /** Index existence check that works on both Postgres and SQLite (test env). */
    private function indexExists(string $table, string $index): bool
    {
        $connection = DB::connection('tenant');

        if ($connection->getDriverName() === 'pgsql') {
            $result = $connection->select(
                'SELECT 1 FROM pg_indexes WHERE tablename = ? AND indexname = ? LIMIT 1',
                [$table, $index]
            );
        } else {
            $result = $connection->select(
                "SELECT 1 FROM sqlite_master WHERE type = 'index' AND name = ? LIMIT 1",
                [$index]
            );
        }

        return ! empty($result);
    }
};
