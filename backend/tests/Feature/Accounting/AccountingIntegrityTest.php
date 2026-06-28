<?php

declare(strict_types=1);

namespace Tests\Feature\Accounting;

use App\Domain\Accounting\Services\AccountMappingService;
use App\Domain\Accounting\Services\FiscalPeriodService;
use App\Domain\Accounting\Services\FXGainLossService;
use App\Domain\Accounting\Services\YearEndClosingService;
use App\Domain\Inventory\Services\InventoryValuationService;
use App\Application\Accounting\UseCases\CloseFiscalYearUseCase;
use App\Application\Purchases\UseCases\ConfirmPurchaseUseCase;
use App\Application\Purchases\UseCases\ConfirmPurchaseReturnUseCase;
use App\Application\Sales\UseCases\ConfirmInvoiceUseCase;
use App\Infrastructure\Eloquent\Models\AccountModel;
use App\Infrastructure\Eloquent\Models\CustomerModel;
use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\PurchaseInvoiceItemModel;
use App\Infrastructure\Eloquent\Models\PurchaseInvoiceModel;
use App\Infrastructure\Eloquent\Models\PurchaseReturnItemModel;
use App\Infrastructure\Eloquent\Models\PurchaseReturnModel;
use App\Infrastructure\Eloquent\Models\SupplierModel;
use App\Infrastructure\Eloquent\Models\WarehouseModel;
use App\Infrastructure\Eloquent\Models\InvoiceModel;
use App\Infrastructure\Eloquent\Models\InvoiceItemModel;
use App\Infrastructure\Eloquent\Models\JournalEntryModel;
use App\Infrastructure\Eloquent\Models\JournalEntryLineModel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class AccountingIntegrityTest extends TestCase
{
    private string $tenantId = '00000000-0000-0000-0000-000000000001';
    private string $userId;
    private string $warehouseId;
    private string $productId;
    private string $supplierId;
    private string $customerId;

    protected function setUp(): void
    {
        parent::setUp();
        \Illuminate\Support\Facades\Schema::connection('tenant')->disableForeignKeyConstraints();
        \Illuminate\Support\Facades\Schema::connection('sqlite')->disableForeignKeyConstraints();
        
        $user = $this->actingAsAuthenticatedUser();
        $this->userId = $user->id;

        $this->setupChartOfAccounts();
        $this->setupMasterData();
    }

    private function setupChartOfAccounts()
    {
        $accounts = [
            ['code' => '1100', 'name' => 'Bank', 'type' => 'asset'],
            ['code' => '1102', 'name' => 'Accounts Receivable', 'type' => 'asset'],
            ['code' => '1200', 'name' => 'Inventory', 'type' => 'asset'],
            ['code' => '2101', 'name' => 'Accounts Payable', 'type' => 'liability'],
            ['code' => '2200', 'name' => 'VAT Payable', 'type' => 'liability'],
            ['code' => '1105', 'name' => 'Input VAT', 'type' => 'asset'],
            ['code' => '3100', 'name' => 'Retained Earnings', 'type' => 'equity'],
            ['code' => '4100', 'name' => 'Sales Revenue', 'type' => 'revenue'],
            ['code' => '5100', 'name' => 'Cost of Goods Sold', 'type' => 'expense'],
            ['code' => '6100', 'name' => 'FX Gain', 'type' => 'revenue'],
            ['code' => '6200', 'name' => 'FX Loss', 'type' => 'expense'],
            ['code' => '4200', 'name' => 'Discount', 'type' => 'expense']
        ];

        $mappings = [];

        foreach ($accounts as $acc) {
            $id = Str::uuid()->toString();
            AccountModel::query()->create([
                'id' => $id,
                'tenant_id' => $this->tenantId,
                'code' => $acc['code'],
                'name' => $acc['name'],
                'name_ar' => $acc['name'] . ' AR',
                'type' => $acc['type'],
                'is_active' => 1
            ]);

            $mapName = match($acc['name']) {
                'Bank' => 'cash',
                'Accounts Receivable' => 'ar',
                'Inventory' => 'inventory',
                'Accounts Payable' => 'ap',
                'VAT Payable' => 'vat_payable',
                'Input VAT' => 'vat_input',
                'Retained Earnings' => 'retained_earnings',
                'Sales Revenue' => 'revenue',
                'Cost of Goods Sold' => 'cogs',
                'FX Gain' => 'fx_gain',
                'FX Loss' => 'fx_loss',
                'Discount' => 'discount',
                default => null
            };

            if ($mapName) {
                $mappings[$mapName] = $id;
            }
        }

        foreach ($mappings as $key => $id) {
            DB::connection('tenant')->table('tenant_settings')->updateOrInsert(
                ['tenant_id' => $this->tenantId, 'key' => "account_mapping_{$key}"],
                ['id' => Str::uuid()->toString(), 'value' => json_encode($id), 'updated_at' => now()]
            );
        }
    }

    private function setupMasterData()
    {
        $wh = WarehouseModel::query()->create(['tenant_id' => $this->tenantId, 'name' => 'Main WH', 'name_ar' => 'Main WH AR', 'is_active' => true]);
        $this->warehouseId = $wh->id;

        $prod = ProductModel::query()->create(['tenant_id' => $this->tenantId, 'name' => 'Test Item', 'name_ar' => 'Test Item AR', 'sku' => 'SKU-001', 'is_active' => true]);
        $this->productId = $prod->id;

        $sup = SupplierModel::query()->create(['tenant_id' => $this->tenantId, 'name' => 'Test Vendor', 'name_ar' => 'Test Vendor AR', 'balance' => 0]);
        $this->supplierId = $sup->id;

        $cust = CustomerModel::query()->create(['tenant_id' => $this->tenantId, 'name' => 'Test Client', 'name_ar' => 'Test Client AR', 'balance' => 0]);
        $this->customerId = $cust->id;
    }

    private function assertFinancialIntegrity()
    {
        // 1. Debit = Credit Assertion
        $totals = DB::connection('tenant')->selectOne("
            SELECT 
                SUM(debit) as total_debit, 
                SUM(credit) as total_credit 
            FROM journal_entry_lines 
            JOIN journal_entries ON journal_entry_lines.journal_entry_id = journal_entries.id 
            WHERE journal_entries.is_posted = 1 AND journal_entries.tenant_id = ?
        ", [$this->tenantId]);

        $debit = round((float) ($totals->total_debit ?? 0), 6);
        $credit = round((float) ($totals->total_credit ?? 0), 6);
        
        $this->assertEquals($debit, $credit, "CRITICAL FAILURE: Debit ($debit) does not equal Credit ($credit)!");

        // 2. Fundamental Accounting Equation (Assets = Liabilities + Equity + Revenue - Expenses)
        $accounts = DB::connection('tenant')->select("
            SELECT a.type, SUM(l.debit) as debits, SUM(l.credit) as credits 
            FROM journal_entry_lines l
            JOIN journal_entries je ON l.journal_entry_id = je.id
            JOIN accounts a ON l.account_id = a.id
            WHERE je.is_posted = 1 AND je.tenant_id = ?
            GROUP BY a.type
        ", [$this->tenantId]);

        $assets = 0.0; $liabilities = 0.0; $equity = 0.0; $revenue = 0.0; $expense = 0.0;

        foreach ($accounts as $acc) {
            $net = round((float)$acc->debits - (float)$acc->credits, 6);
            if ($acc->type === 'asset') $assets += $net;
            if ($acc->type === 'liability') $liabilities -= $net; // Liabilities normal credit
            if ($acc->type === 'equity') $equity -= $net; // Equity normal credit
            if ($acc->type === 'revenue') $revenue -= $net; // Revenue normal credit
            if ($acc->type === 'expense') $expense += $net; // Expense normal debit
        }

        $leftSide = round($assets, 6);
        $rightSide = round($liabilities + $equity + $revenue - $expense, 6);

        $this->assertEquals($leftSide, $rightSide, "CRITICAL FAILURE: Assets ($leftSide) do not equal L+E+R-Ex ($rightSide)!");
    }

    public function test_full_financial_lifecycle_maintains_absolute_integrity()
    {
        $currencyId = DB::connection('tenant')->table('currencies')->where('is_base', 1)->value('id');

        try {
            // STEP 1: PURCHASE (Buy 100 units @ $100 = $10,000) + 15% VAT
            $pi = PurchaseInvoiceModel::query()->create([
                'tenant_id' => $this->tenantId, 'supplier_id' => $this->supplierId, 'warehouse_id' => $this->warehouseId, 
                'currency_id' => $currencyId, 'exchange_rate' => 1.0,
                'invoice_number' => 'PI-001', 'invoice_date' => now(), 'subtotal' => 10000, 'vat_amount' => 1500, 'total' => 11500, 'status' => 'draft'
            ]);
            $invoiceId = $pi->id;
            PurchaseInvoiceItemModel::query()->create([
                'tenant_id' => $this->tenantId, 'purchase_invoice_id' => $invoiceId,
                'product_id' => $this->productId, 'quantity' => 100, 'unit_price' => 100, 'vat_rate' => 15, 'total' => 11500
            ]);

            app(ConfirmPurchaseUseCase::class)->execute($invoiceId, $this->warehouseId, $this->userId);
            $this->assertFinancialIntegrity();

            // STEP 2: SALE (Sell 50 units @ $200 = $10,000)
            $si = InvoiceModel::query()->create([
                'tenant_id' => $this->tenantId, 'customer_id' => $this->customerId, 'warehouse_id' => $this->warehouseId,
                'currency_id' => $currencyId, 'exchange_rate' => 1.0,
                'invoice_number' => 'INV-001', 'invoice_date' => now(), 'subtotal' => 10000, 'vat_amount' => 1500, 'total' => 11500, 'status' => 'draft',
                'type' => 'standard'
            ]);
            $salesInvoiceId = $si->id;
            InvoiceItemModel::query()->create([
                'tenant_id' => $this->tenantId, 'invoice_id' => $salesInvoiceId,
                'product_id' => $this->productId, 'quantity' => 50, 'unit_price' => 200, 'vat_rate' => 15, 'total' => 11500
            ]);

            app(ConfirmInvoiceUseCase::class)->execute($salesInvoiceId, $this->warehouseId, $this->userId);
            $this->assertFinancialIntegrity();

            // STEP 3: PURCHASE RETURN (Return 10 units @ $100 = $1,000)
            $pr = PurchaseReturnModel::query()->create([
                'tenant_id' => $this->tenantId, 'supplier_id' => $this->supplierId,
                'number' => 'PR-001', 'issue_date' => now(), 'total_amount' => 1150, 'tax_amount' => 150, 'status' => 'draft'
            ]);
            $returnId = $pr->id;
            PurchaseReturnItemModel::query()->create([
                'tenant_id' => $this->tenantId, 'purchase_return_id' => $returnId,
                'product_id' => $this->productId, 'quantity' => 10, 'unit_price' => 100, 'tax_rate' => 15, 'tax_amount' => 150, 'total' => 1150
            ]);

            app(ConfirmPurchaseReturnUseCase::class)->execute($returnId, $this->warehouseId, $this->userId);
            $this->assertFinancialIntegrity();
        } catch (\Exception $e) {
            // Surface as a real test failure instead of dd()-halting the whole suite.
            $this->fail('Financial lifecycle threw: '.$e->getMessage());
        }

        // STEP 4: FISCAL YEAR CLOSE
        $period = DB::connection('tenant')->table('fiscal_periods')->first();
        app(CloseFiscalYearUseCase::class)->execute($period->id, $this->userId);

        // After Fiscal Close, Revenue and Expense should be precisely 0
        $accounts = DB::connection('tenant')->select("
            SELECT a.type, COALESCE(SUM(l.debit) - SUM(l.credit), 0) as net 
            FROM accounts a
            LEFT JOIN journal_entry_lines l ON l.account_id = a.id
            LEFT JOIN journal_entries je ON l.journal_entry_id = je.id AND je.is_posted = 1
            WHERE a.tenant_id = ? AND a.type IN ('revenue', 'expense')
            GROUP BY a.type
        ", [$this->tenantId]);

        foreach ($accounts as $acc) {
            $this->assertEquals(0.0, round((float)$acc->net, 6), "{$acc->type} was not fully zeroed out during Fiscal Close!");
        }

        $this->assertFinancialIntegrity();
    }
}
