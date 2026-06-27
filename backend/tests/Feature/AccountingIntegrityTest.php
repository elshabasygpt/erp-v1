<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AccountingIntegrityTest extends TestCase
{
    /**
     * Verify that Debit = Credit for all posted journal entries.
     */
    public function test_debit_equals_credit_for_all_journal_entries()
    {
        // Get all tenants to verify across all databases if multi-tenant
        // For testing, we can check the tenant connection directly if there's a default one.
        // Assuming the tests run on a test database.

        $entries = DB::connection('tenant')->table('journal_entries')
            ->where('is_posted', true)
            ->get();

        foreach ($entries as $entry) {
            $totals = DB::connection('tenant')->table('journal_entry_lines')
                ->where('journal_entry_id', $entry->id)
                ->selectRaw('
                    COALESCE(SUM(debit), 0) as total_debit,
                    COALESCE(SUM(credit), 0) as total_credit
                ')
                ->first();

            $debit = bcadd((string)$totals->total_debit, '0.000000', 6);
            $credit = bcadd((string)$totals->total_credit, '0.000000', 6);

            $this->assertEquals($debit, $credit, "Journal entry {$entry->id} is out of balance. Debit: $debit, Credit: $credit");
        }

        // Also do a global check
        $globalTotals = DB::connection('tenant')->table('journal_entry_lines')
            ->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
            ->where('journal_entries.is_posted', true)
            ->selectRaw('
                COALESCE(SUM(debit), 0) as total_debit,
                COALESCE(SUM(credit), 0) as total_credit
            ')
            ->first();

        $globalDebit = bcadd((string)$globalTotals->total_debit, '0.000000', 6);
        $globalCredit = bcadd((string)$globalTotals->total_credit, '0.000000', 6);

        $this->assertEquals($globalDebit, $globalCredit, "Global Debit != Credit. Debit: $globalDebit, Credit: $globalCredit");
    }

    /**
     * Verify that Assets = Liabilities + Equity globally.
     */
    public function test_assets_equal_liabilities_plus_equity()
    {
        // Get balances per account type
        // Usually, Asset = Debit normal, Liability = Credit normal, Equity = Credit normal
        
        $accounts = DB::connection('tenant')->table('accounts')->get();
        
        $assets = '0.000000';
        $liabilities = '0.000000';
        $equity = '0.000000';
        
        foreach ($accounts as $account) {
            // Calculate current balance based on journal entries
            $totals = DB::connection('tenant')->table('journal_entry_lines')
                ->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
                ->where('journal_entries.is_posted', true)
                ->where('journal_entry_lines.account_id', $account->id)
                ->selectRaw('
                    COALESCE(SUM(debit), 0) as total_debit,
                    COALESCE(SUM(credit), 0) as total_credit
                ')
                ->first();
                
            $debit = bcadd((string)$totals->total_debit, '0.000000', 6);
            $credit = bcadd((string)$totals->total_credit, '0.000000', 6);
            
            if ($account->type === 'asset') {
                $balance = bcsub($debit, $credit, 6);
                $assets = bcadd($assets, $balance, 6);
            } elseif ($account->type === 'liability') {
                $balance = bcsub($credit, $debit, 6);
                $liabilities = bcadd($liabilities, $balance, 6);
            } elseif ($account->type === 'equity') {
                $balance = bcsub($credit, $debit, 6);
                $equity = bcadd($equity, $balance, 6);
            } elseif ($account->type === 'revenue') {
                // Revenue increases equity
                $balance = bcsub($credit, $debit, 6);
                $equity = bcadd($equity, $balance, 6);
            } elseif ($account->type === 'expense') {
                // Expense decreases equity
                $balance = bcsub($debit, $credit, 6);
                $equity = bcsub($equity, $balance, 6);
            }
        }
        
        $liabilitiesPlusEquity = bcadd($liabilities, $equity, 6);
        
        $this->assertEquals($assets, $liabilitiesPlusEquity, "Accounting equation failed: Assets ($assets) != Liabilities ($liabilities) + Equity ($equity)");
    }
}
