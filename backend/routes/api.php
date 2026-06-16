<?php

use Illuminate\Support\Facades\Route;
use App\Presentation\Controllers\API\Auth\AuthController;
use App\Presentation\Controllers\API\Auth\UserController;
use App\Presentation\Controllers\API\Sales\InvoiceController;
use App\Presentation\Controllers\API\Sales\WarrantyController;
use App\Presentation\Controllers\API\Inventory\ProductController;
use App\Presentation\Controllers\API\Accounting\ReportsController;
use App\Presentation\Controllers\API\CRM\CustomerController;
use App\Presentation\Controllers\API\CRM\SupplierController;
use App\Presentation\Controllers\API\Purchases\PurchaseController;
use App\Presentation\Controllers\API\Partnerships\PartnerController;
use App\Presentation\Controllers\API\Partnerships\ProfitDistributionController;
use App\Presentation\Controllers\API\Inventory\VehicleController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| All tenant API routes are wrapped with tenant + subscription middleware.
| Rate limiting is applied globally.
|
*/

// Dummy login route to prevent 500 RouteNotFoundException on browser visits
Route::get('/login', function () {
    return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
})->name('login');

// Public routes (no auth needed)
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:5,1');
});

// Tenant-scoped, authenticated routes
Route::middleware(['tenant', 'subscription.active', 'auth:sanctum', 'throttle:120,1'])->group(function () {

    // Auth & Users
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::apiResource('users', UserController::class);

    // Sales / POS
    Route::prefix('sales')->group(function () {
        // Channels
        Route::post('/channels/upload-image', [\App\Presentation\Controllers\API\Sales\SalesChannelController::class, 'uploadImage']);
        Route::apiResource('channels', \App\Presentation\Controllers\API\Sales\SalesChannelController::class);
        
        Route::get('/invoices', [InvoiceController::class, 'index']);
        Route::post('/invoices/bulk', [InvoiceController::class, 'bulkStore'])->middleware('throttle:30,1');
        Route::post('/invoices', [InvoiceController::class, 'store'])->middleware('throttle:60,1');
        Route::get('/invoices/{id}', [InvoiceController::class, 'show']);
        Route::put('/invoices/{id}', [InvoiceController::class, 'update'])->middleware('throttle:60,1');
        Route::put('/invoices/{id}/status', [InvoiceController::class, 'updateStatus']);
        Route::get('/reports/sales', [InvoiceController::class, 'salesReport']);
        
        // Advanced Sales Reports
        Route::get('/advanced-reports/kpis', [\App\Presentation\Controllers\API\Sales\AdvancedSalesReportController::class, 'getDashboardKPIs']);
        Route::get('/advanced-reports/charts', [\App\Presentation\Controllers\API\Sales\AdvancedSalesReportController::class, 'getDashboardCharts']);
        
        // Sales Returns
        Route::get('/returns', [\App\Presentation\Controllers\API\Sales\SalesReturnController::class, 'index']);
        Route::post('/returns', [\App\Presentation\Controllers\API\Sales\SalesReturnController::class, 'store']);
        Route::get('/returns/{id}', [\App\Presentation\Controllers\API\Sales\SalesReturnController::class, 'show']);
        Route::put('/returns/{id}/status', [\App\Presentation\Controllers\API\Sales\SalesReturnController::class, 'updateStatus']);
        
        // Warranties
        Route::prefix('warranties')->group(function () {
            Route::get('/', [WarrantyController::class, 'index']);
            Route::post('/', [WarrantyController::class, 'store']);
            Route::get('/report', [WarrantyController::class, 'report']);
            Route::get('/invoice/{invoiceId}', [WarrantyController::class, 'checkByInvoice']);
            Route::get('/{id}', [WarrantyController::class, 'show']);
            Route::put('/{id}/status', [WarrantyController::class, 'updateStatus']);
            Route::post('/{warrantyId}/claims', [WarrantyController::class, 'storeClaim']);
            Route::put('/{warrantyId}/claims/{claimId}', [WarrantyController::class, 'updateClaim']);
        });

        // Quotations
        Route::get('/quotations', [\App\Presentation\Controllers\API\Sales\QuotationController::class, 'index']);
        Route::post('/quotations', [\App\Presentation\Controllers\API\Sales\QuotationController::class, 'store']);
        Route::get('/quotations/{id}', [\App\Presentation\Controllers\API\Sales\QuotationController::class, 'show']);
        Route::put('/quotations/{id}', [\App\Presentation\Controllers\API\Sales\QuotationController::class, 'update']);
        Route::put('/quotations/{id}/status', [\App\Presentation\Controllers\API\Sales\QuotationController::class, 'updateStatus']);
        
        // Sales Orders
        Route::get('/orders', [\App\Presentation\Controllers\API\Sales\SalesOrderController::class, 'index']);
        Route::post('/orders', [\App\Presentation\Controllers\API\Sales\SalesOrderController::class, 'store']);
        Route::get('/orders/{id}', [\App\Presentation\Controllers\API\Sales\SalesOrderController::class, 'show']);
        Route::post('/orders/{id}/fulfill', [\App\Presentation\Controllers\API\Sales\SalesOrderController::class, 'fulfill']);
        Route::post('/orders/{id}/cancel', [\App\Presentation\Controllers\API\Sales\SalesOrderController::class, 'cancel']);
        
        // Shipping
        Route::get('/shipping', [\App\Presentation\Controllers\API\Sales\ShippingController::class, 'index']);
        Route::post('/shipping', [\App\Presentation\Controllers\API\Sales\ShippingController::class, 'store']);
        Route::get('/shipping/{id}', [\App\Presentation\Controllers\API\Sales\ShippingController::class, 'show']);
        Route::put('/shipping/{id}', [\App\Presentation\Controllers\API\Sales\ShippingController::class, 'update']);
        Route::put('/shipping/{id}/status', [\App\Presentation\Controllers\API\Sales\ShippingController::class, 'updateStatus']);

        // Deliveries
        Route::get('/deliveries', [\App\Presentation\Controllers\API\Sales\DeliveryController::class, 'index']);
        Route::post('/deliveries', [\App\Presentation\Controllers\API\Sales\DeliveryController::class, 'store']);
        Route::get('/deliveries/{id}', [\App\Presentation\Controllers\API\Sales\DeliveryController::class, 'show']);
        Route::post('/deliveries/{id}/assign', [\App\Presentation\Controllers\API\Sales\DeliveryController::class, 'assign']);
        Route::put('/deliveries/{id}/status', [\App\Presentation\Controllers\API\Sales\DeliveryController::class, 'updateStatus']);
    });

    // Approvals
    Route::prefix('approvals')->group(function () {
        Route::get('/inbox', [\App\Presentation\Controllers\API\Approvals\ApprovalController::class, 'inbox']);
        Route::post('/{id}/approve', [\App\Presentation\Controllers\API\Approvals\ApprovalController::class, 'approve']);
        Route::post('/{id}/reject', [\App\Presentation\Controllers\API\Approvals\ApprovalController::class, 'reject']);
        Route::get('/rules', [\App\Presentation\Controllers\API\Approvals\ApprovalController::class, 'getRules']);
        Route::post('/rules', [\App\Presentation\Controllers\API\Approvals\ApprovalController::class, 'saveRule']);
    });

    // Treasury & Accounting
    Route::prefix('treasury')->group(function () {
        Route::get('/safes', [\App\Presentation\Controllers\API\Treasury\TreasuryController::class, 'getSafes']);
        Route::post('/safes', [\App\Presentation\Controllers\API\Treasury\TreasuryController::class, 'storeSafe']);
        Route::post('/safes/{id}/assign-user', [\App\Presentation\Controllers\API\Treasury\TreasuryController::class, 'assignUser']);
        Route::post('/transactions', [\App\Presentation\Controllers\API\Treasury\TreasuryController::class, 'storeTransaction']);
        Route::post('/transfer', [\App\Presentation\Controllers\API\Treasury\TreasuryController::class, 'transfer']);
    });

    Route::prefix('expenses')->group(function () {
        Route::get('/categories', [\App\Presentation\Controllers\API\Treasury\ExpenseController::class, 'getCategories']);
        Route::post('/categories', [\App\Presentation\Controllers\API\Treasury\ExpenseController::class, 'storeCategory']);
        Route::get('/', [\App\Presentation\Controllers\API\Treasury\ExpenseController::class, 'index']);
        Route::post('/', [\App\Presentation\Controllers\API\Treasury\ExpenseController::class, 'store']);
    });


    
    // Reports
    Route::prefix('reports')->group(function () {
        Route::get('/pl', [\App\Presentation\Controllers\API\Reports\ReportController::class, 'getProfitAndLoss']);
        Route::get('/inventory', [\App\Presentation\Controllers\API\Reports\ReportController::class, 'getInventoryReport']);
        Route::get('/accounts', [\App\Presentation\Controllers\API\Reports\ReportController::class, 'getAccountsReport']);
        Route::get('/kpis', [\App\Presentation\Controllers\API\Reports\ReportController::class, 'getGeneralKpis']);
        Route::get('/vat-report', [\App\Presentation\Controllers\API\Reports\ReportController::class, 'getVatReport']);
        Route::get('/aging', [\App\Presentation\Controllers\API\Reports\ReportController::class, 'getAgingReport']);
    });

    // Advanced Analytics
    Route::prefix('analytics')->group(function () {
        Route::get('sales-performance', [\App\Presentation\Controllers\API\Analytics\AdvancedAnalyticsController::class, 'salesPerformance']);
        Route::get('profitability', [\App\Presentation\Controllers\API\Analytics\AdvancedAnalyticsController::class, 'profitabilityAnalysis']);
        Route::get('sales-by-channel', [\App\Presentation\Controllers\API\Analytics\AdvancedAnalyticsController::class, 'salesByChannel']);
        Route::get('returns-analysis', [\App\Presentation\Controllers\API\Analytics\AdvancedAnalyticsController::class, 'returnsAnalysis']);
        Route::get('customer-lifetime-value', [\App\Presentation\Controllers\API\Analytics\AdvancedAnalyticsController::class, 'customerLifetimeValue']);
        Route::get('discount-analysis', [\App\Presentation\Controllers\API\Analytics\AdvancedAnalyticsController::class, 'discountAnalysis']);
        Route::get('top-categories', [\App\Presentation\Controllers\API\Analytics\AdvancedAnalyticsController::class, 'topCategories']);
        Route::get('conversion-funnel', [\App\Presentation\Controllers\API\Analytics\AdvancedAnalyticsController::class, 'conversionFunnel']);
    });
    
    // Inventory
    Route::prefix('inventory')->group(function () {
        // Branches & Warehouses
        Route::apiResource('branches', \App\Presentation\Controllers\API\Inventory\BranchController::class);
        Route::apiResource('warehouses', \App\Presentation\Controllers\API\Inventory\WarehouseController::class);

        // Stock Transfers
        Route::get('/stock-transfers', [\App\Presentation\Controllers\API\Inventory\StockTransferController::class, 'index']);
        Route::post('/stock-transfers', [\App\Presentation\Controllers\API\Inventory\StockTransferController::class, 'store']);
        Route::get('/stock-transfers/{id}', [\App\Presentation\Controllers\API\Inventory\StockTransferController::class, 'show']);
        Route::post('/stock-transfers/{id}/approve', [\App\Presentation\Controllers\API\Inventory\StockTransferController::class, 'approve']);
        Route::post('/stock-transfers/{id}/receive', [\App\Presentation\Controllers\API\Inventory\StockTransferController::class, 'receive']);
        Route::delete('/stock-transfers/{id}', [\App\Presentation\Controllers\API\Inventory\StockTransferController::class, 'destroy']);

        // Products
        Route::get('/products', [ProductController::class, 'index']);
        Route::post('/products', [ProductController::class, 'store']);
        Route::post('/products/upload-image', [ProductController::class, 'uploadImage']);
        Route::get('/products/search', [ProductController::class, 'search']);
        Route::get('/products/low-stock', [ProductController::class, 'lowStock']);
        Route::get('/products/barcode/{barcode}', [ProductController::class, 'scanBarcode']);
        Route::get('/products/{id}', [ProductController::class, 'show']);
        Route::put('/products/{id}', [ProductController::class, 'update']);
        Route::delete('/products/{id}', [ProductController::class, 'destroy']);

        // Stock Movements
        Route::get('/movements/summary', [\App\Presentation\Controllers\API\Inventory\StockMovementController::class, 'summary']);
        Route::get('/movements', [\App\Presentation\Controllers\API\Inventory\StockMovementController::class, 'index']);
        Route::post('/movements', [\App\Presentation\Controllers\API\Inventory\StockMovementController::class, 'store']);
        
        // Inventory Valuation
        Route::get('/valuation', [\App\Presentation\Controllers\API\Inventory\InventoryValuationController::class, 'report']);

        // Adjustments
        Route::get('/adjustments', [\App\Presentation\Controllers\API\Inventory\AdjustmentController::class, 'index']);
        Route::post('/adjustments', [\App\Presentation\Controllers\API\Inventory\AdjustmentController::class, 'store']);
        Route::get('/adjustments/{id}', [\App\Presentation\Controllers\API\Inventory\AdjustmentController::class, 'show']);

        // Assembly (BOM)
        Route::get('/assembly/{productId}', [\App\Presentation\Controllers\API\Inventory\AssemblyController::class, 'getComponents']);
        Route::post('/assembly/{productId}', [\App\Presentation\Controllers\API\Inventory\AssemblyController::class, 'setComponents']);
        Route::post('/assemble', [\App\Presentation\Controllers\API\Inventory\AssemblyController::class, 'assemble']);

        // Vehicle Compatibility
        Route::prefix('vehicles')->group(function () {
            Route::get('/makes', [VehicleController::class, 'getMakes']);
            Route::post('/makes', [VehicleController::class, 'storeMake']);
            Route::post('/makes/{id}', [VehicleController::class, 'updateMake']);
            Route::get('/makes/{makeId}/models', [VehicleController::class, 'getModels']);
            Route::get('/models/{modelId}/years', [VehicleController::class, 'getYears']);
            Route::post('/models', [VehicleController::class, 'storeModel']);
            Route::post('/models/{id}', [VehicleController::class, 'updateModel']);
            Route::post('/years', [VehicleController::class, 'storeYear']);
            Route::post('/years/{id}', [VehicleController::class, 'updateYear']);
            
            Route::delete('/makes/{id}', [VehicleController::class, 'destroyMake']);
            Route::delete('/models/{id}', [VehicleController::class, 'destroyModel']);
            Route::delete('/years/{id}', [VehicleController::class, 'destroyYear']);

            Route::get('/search-by-vehicle', [VehicleController::class, 'searchByVehicle']);
            Route::get('/quick-lookup', [VehicleController::class, 'quickLookup']);
            Route::get('/product/{productId}/compatibility', [VehicleController::class, 'getProductCompatibility']);
            Route::post('/product/{productId}/compatibility', [VehicleController::class, 'attachVehicle']);
            Route::delete('/product/{productId}/compatibility/{vehicleYearId}', [VehicleController::class, 'detachVehicle']);
        });
    });

    // CRM (Customers & Suppliers)
    Route::prefix('crm')->group(function () {
        Route::get('receivables/aging', [\App\Presentation\Controllers\API\CRM\ReceivableController::class, 'agingReport']);
        Route::get('receivables/statement/{customerId}', [\App\Presentation\Controllers\API\CRM\ReceivableController::class, 'statement']);
        Route::post('receivables/collect', [\App\Presentation\Controllers\API\CRM\ReceivableController::class, 'collectPayment']);

        Route::get('customers/export', [CustomerController::class, 'export']);
        Route::post('customers/import', [CustomerController::class, 'import']);
        Route::get('customers/{id}/statement', [CustomerController::class, 'statement']);
        
        // CRM Integration & Salesperson Tools
        Route::get('customers/{id}/insights', [\App\Presentation\Controllers\API\CRM\CrmDashboardController::class, 'getCustomerInsights']);
        Route::post('customers/{id}/notes', [\App\Presentation\Controllers\API\CRM\CustomerInteractionController::class, 'addNote']);
        Route::post('customers/{id}/interactions', [\App\Presentation\Controllers\API\CRM\CustomerInteractionController::class, 'addInteraction']);
        
        Route::get('follow-ups', [\App\Presentation\Controllers\API\CRM\SalesFollowUpController::class, 'index']);
        Route::post('follow-ups', [\App\Presentation\Controllers\API\CRM\SalesFollowUpController::class, 'store']);
        Route::put('follow-ups/{id}/complete', [\App\Presentation\Controllers\API\CRM\SalesFollowUpController::class, 'markCompleted']);

        Route::apiResource('customers', CustomerController::class);
        
        Route::post('vouchers', [\App\Presentation\Controllers\API\CRM\VoucherController::class, 'store']);
        Route::get('suppliers/export', [SupplierController::class, 'export']);
        Route::post('suppliers/import', [SupplierController::class, 'import']);
        Route::get('suppliers/{id}/statement', [SupplierController::class, 'statement']);
        Route::apiResource('suppliers', SupplierController::class);
    });

    // Purchases
    Route::prefix('purchases')->group(function () {
        Route::get('/invoices', [PurchaseController::class, 'index']);
        Route::post('/invoices', [PurchaseController::class, 'store']);
        Route::get('/invoices/{id}', [PurchaseController::class, 'show']);
        Route::put('/invoices/{id}', [PurchaseController::class, 'update']);
        Route::put('/invoices/{id}/status', [PurchaseController::class, 'updateStatus']);
        
        // Purchase Returns
        Route::get('/returns', [\App\Presentation\Controllers\API\Purchases\PurchaseReturnController::class, 'index']);
        Route::post('/returns', [\App\Presentation\Controllers\API\Purchases\PurchaseReturnController::class, 'store']);
        Route::get('/returns/{id}', [\App\Presentation\Controllers\API\Purchases\PurchaseReturnController::class, 'show']);
        Route::put('/returns/{id}/status', [\App\Presentation\Controllers\API\Purchases\PurchaseReturnController::class, 'updateStatus']);

        // Supplier Payment Allocations
        Route::get('/payments/{paymentId}/allocations', [\App\Presentation\Controllers\API\Purchases\SupplierPaymentAllocationController::class, 'index']);
        Route::post('/payments/{paymentId}/allocations', [\App\Presentation\Controllers\API\Purchases\SupplierPaymentAllocationController::class, 'store']);
    });

    // ZATCA Integration onboarding
    Route::prefix('zatca')->group(function () {
        Route::post('/onboard', [\App\Presentation\Controllers\API\Sales\ZatcaOnboardingController::class, 'submitOtp']);
        Route::get('/status', [\App\Presentation\Controllers\API\Sales\ZatcaOnboardingController::class, 'status']);
    });

    // Partnerships & Profit Distribution
    Route::prefix('partnerships')->group(function () {
        Route::apiResource('partners', PartnerController::class);
        Route::post('/partners/{id}/withdraw', [PartnerController::class, 'withdrawProfits']);
        
        Route::get('/distributions', [ProfitDistributionController::class, 'index']);
        Route::get('/distributions/preview', [ProfitDistributionController::class, 'preview']);
        Route::post('/distributions', [ProfitDistributionController::class, 'store']);
    });

    // Treasury (Receipts, Payments, Transfers)
    Route::prefix('treasury')->group(function () {
        Route::post('/receipts', [\App\Presentation\Controllers\API\Treasury\TreasuryController::class, 'receipt']);
        Route::post('/payments', [\App\Presentation\Controllers\API\Treasury\TreasuryController::class, 'payment']);
        Route::post('/transfers', [\App\Presentation\Controllers\API\Treasury\TreasuryController::class, 'transfer']);
    });

    // Accounting & Reports
    Route::prefix('accounting')->group(function () {
        Route::get('/chart-of-accounts', [ReportsController::class, 'chartOfAccounts']);
        Route::get('/journal-entries', [ReportsController::class, 'journalEntries']);
        Route::get('/reports/trial-balance', [ReportsController::class, 'trialBalance']);
        Route::get('/reports/income-statement', [ReportsController::class, 'incomeStatement']);
        Route::get('/reports/balance-sheet', [ReportsController::class, 'balanceSheet']);
        Route::get('/reports/general-ledger', [ReportsController::class, 'generalLedger']);
        
        // Fixed Assets
        Route::apiResource('fixed-assets', \App\Presentation\Controllers\API\Accounting\FixedAssetController::class);
        Route::post('fixed-assets/{id}/depreciate', [\App\Presentation\Controllers\API\Accounting\FixedAssetController::class, 'calculateDepreciation']);
        
        // Account Mappings
        Route::get('/account-mappings', [\App\Presentation\Controllers\API\Accounting\AccountingSettingsController::class, 'getAccountMappings']);
        Route::put('/account-mappings', [\App\Presentation\Controllers\API\Accounting\AccountingSettingsController::class, 'updateAccountMappings']);

        // Fiscal Periods
        Route::get('/fiscal-periods', [\App\Presentation\Controllers\API\Accounting\AccountingSettingsController::class, 'listFiscalPeriods']);
        Route::post('/fiscal-periods', [\App\Presentation\Controllers\API\Accounting\AccountingSettingsController::class, 'createFiscalPeriod']);
        Route::post('/fiscal-periods/{id}/close', [\App\Presentation\Controllers\API\Accounting\AccountingSettingsController::class, 'closeFiscalPeriod']);
        Route::post('/fiscal-periods/{id}/reopen', [\App\Presentation\Controllers\API\Accounting\AccountingSettingsController::class, 'reopenFiscalPeriod']);

        // Bank Accounts & Reconciliations
        Route::apiResource('bank-accounts', \App\Presentation\Controllers\API\Accounting\BankAccountController::class);
        Route::post('bank-accounts/{id}/import-transactions', [\App\Presentation\Controllers\API\Accounting\BankAccountController::class, 'importTransactions']);
        Route::post('bank-accounts/{id}/reconciliations', [\App\Presentation\Controllers\API\Accounting\BankAccountController::class, 'startReconciliation']);
        Route::get('bank-accounts/{id}/reconciliations', [\App\Presentation\Controllers\API\Accounting\BankAccountController::class, 'getReconciliations']);
        Route::post('reconciliations/{id}/match', [\App\Presentation\Controllers\API\Accounting\BankAccountController::class, 'matchTransaction']);
        Route::post('reconciliations/{id}/complete', [\App\Presentation\Controllers\API\Accounting\BankAccountController::class, 'completeReconciliation']);

        // Credit Notes
        Route::get('credit-notes', [\App\Presentation\Controllers\API\Accounting\CreditNoteController::class, 'index']);
        Route::post('credit-notes', [\App\Presentation\Controllers\API\Accounting\CreditNoteController::class, 'store']);
        Route::post('credit-notes/{id}/apply', [\App\Presentation\Controllers\API\Accounting\CreditNoteController::class, 'apply']);
    });

    // Settings
    Route::get('/settings', [\App\Presentation\Controllers\API\SettingsController::class, 'index']);
    Route::put('/settings', [\App\Presentation\Controllers\API\SettingsController::class, 'update']);
    
    // Webhooks
    Route::prefix('webhooks')->group(function () {
        Route::get('/', [\App\Presentation\Controllers\API\Settings\WebhookController::class, 'index']);
        Route::post('/', [\App\Presentation\Controllers\API\Settings\WebhookController::class, 'store']);
        Route::get('/{id}', [\App\Presentation\Controllers\API\Settings\WebhookController::class, 'show']);
        Route::put('/{id}', [\App\Presentation\Controllers\API\Settings\WebhookController::class, 'update']);
        Route::delete('/{id}', [\App\Presentation\Controllers\API\Settings\WebhookController::class, 'destroy']);
        Route::get('/{id}/logs', [\App\Presentation\Controllers\API\Settings\WebhookController::class, 'getLogs']);
    });

    // HR & Payroll
    Route::prefix('hr')->group(function () {
        Route::get('/employees', [\App\Presentation\Controllers\API\HR\EmployeeController::class, 'index']);
        Route::post('/employees', [\App\Presentation\Controllers\API\HR\EmployeeController::class, 'store']);
        Route::get('/employees/{id}', [\App\Presentation\Controllers\API\HR\EmployeeController::class, 'show']);
        Route::put('/employees/{id}', [\App\Presentation\Controllers\API\HR\EmployeeController::class, 'update']);
        Route::delete('/employees/{id}', [\App\Presentation\Controllers\API\HR\EmployeeController::class, 'destroy']);

        Route::get('/attendance', [\App\Presentation\Controllers\API\HR\AttendanceController::class, 'index']);
        Route::post('/attendance/check-in', [\App\Presentation\Controllers\API\HR\AttendanceController::class, 'checkIn']);
        Route::post('/attendance/check-out', [\App\Presentation\Controllers\API\HR\AttendanceController::class, 'checkOut']);
        Route::put('/attendance/{id}/status', [\App\Presentation\Controllers\API\HR\AttendanceController::class, 'updateStatus']);

        Route::get('/leaves', [\App\Presentation\Controllers\API\HR\LeaveController::class, 'index']);
        Route::post('/leaves', [\App\Presentation\Controllers\API\HR\LeaveController::class, 'store']);
        Route::put('/leaves/{id}/status', [\App\Presentation\Controllers\API\HR\LeaveController::class, 'updateStatus']);

        Route::get('/payroll', [\App\Presentation\Controllers\API\HR\PayrollController::class, 'index']);
        Route::post('/payroll/generate', [\App\Presentation\Controllers\API\HR\PayrollController::class, 'generate']);
        Route::post('/payroll/{id}/pay', [\App\Presentation\Controllers\API\HR\PayrollController::class, 'markAsPaid']);
    });

    // AI & Forecasting Analytics
    Route::prefix('forecasting')->group(function () {
        Route::get('/inventory-forecast', [\App\Presentation\Controllers\API\Analytics\ForecastingController::class, 'getInventoryForecast']);
        Route::post('/auto-draft-po', [\App\Presentation\Controllers\API\Analytics\ForecastingController::class, 'autoDraftPurchaseOrder']);
        Route::get('/partner-forecast', [\App\Presentation\Controllers\API\Analytics\ForecastingController::class, 'getPartnerForecast']);
    });

    // Admin: Partner Portal Management
    Route::prefix('partnerships')->group(function () {
        Route::post('/partners/{id}/enable-portal', [PartnerController::class, 'enablePortal']);
        Route::post('/partners/{id}/send-magic-link', [PartnerController::class, 'sendMagicLink']);
    });

    // Subscriptions
    Route::prefix('subscriptions')->group(function () {
        Route::get('/current', [\App\Presentation\Controllers\API\Subscription\SubscriptionController::class, 'current']);
        Route::post('/checkout', [\App\Presentation\Controllers\API\Subscription\SubscriptionController::class, 'checkout']);
    });
});

// ─────────────────────────────────────────────────────────────
//  Partner Portal — Separate auth, tenant-scoped via query param
// ─────────────────────────────────────────────────────────────
Route::middleware(['tenant'])->prefix('portal')->group(function () {
    // Public portal auth
    Route::post('/login', [\App\Presentation\Controllers\API\Portal\PartnerAuthController::class, 'login']);
    Route::post('/magic-link', [\App\Presentation\Controllers\API\Portal\PartnerAuthController::class, 'sendMagicLink']);
    Route::post('/magic-link/verify', [\App\Presentation\Controllers\API\Portal\PartnerAuthController::class, 'verifyMagicLink']);

    // Protected portal routes (partner token required)
    Route::middleware(['partner.auth'])->group(function () {
        Route::get('/me', [\App\Presentation\Controllers\API\Portal\PartnerAuthController::class, 'me']);
        Route::post('/logout', [\App\Presentation\Controllers\API\Portal\PartnerAuthController::class, 'logout']);
        Route::get('/dashboard', [\App\Presentation\Controllers\API\Portal\PartnerDashboardController::class, 'dashboard']);
        Route::get('/profits', [\App\Presentation\Controllers\API\Portal\PartnerDashboardController::class, 'profits']);
        Route::get('/statement', [\App\Presentation\Controllers\API\Portal\PartnerDashboardController::class, 'statement']);
        Route::get('/statement/pdf', [\App\Presentation\Controllers\API\Portal\PartnerDashboardController::class, 'exportPdf']);
        Route::get('/top-products', [\App\Presentation\Controllers\API\Portal\PartnerDashboardController::class, 'topProducts']);
        Route::get('/forecast', [\App\Presentation\Controllers\API\Portal\PartnerDashboardController::class, 'forecast']);
    });
});
