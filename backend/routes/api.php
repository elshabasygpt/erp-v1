<?php

use App\Presentation\Controllers\API\Accounting\AccountingSettingsController;
use App\Presentation\Controllers\API\Accounting\OpeningBalanceController;
use App\Presentation\Controllers\API\Accounting\BankAccountController;
use App\Presentation\Controllers\API\Accounting\BudgetController;
use App\Presentation\Controllers\API\Accounting\ChartOfAccountsController;
use App\Presentation\Controllers\API\Accounting\CostCenterController;
use App\Presentation\Controllers\API\Accounting\FinancialReportsController;
use App\Presentation\Controllers\API\Accounting\JournalEntryController;
use App\Presentation\Controllers\API\Accounting\CreditNoteController;
use App\Presentation\Controllers\API\Accounting\FixedAssetController;
use App\Presentation\Controllers\API\Accounting\RecurringJournalEntryController;
use App\Presentation\Controllers\API\Accounting\ReportsController;
use App\Presentation\Controllers\API\Reports\SalesAnalyticsController;
use App\Presentation\Controllers\API\Analytics\AdvancedAnalyticsController;
use App\Presentation\Controllers\API\Analytics\AnalyticsController;
use App\Presentation\Controllers\API\Analytics\ForecastingController;
use App\Presentation\Controllers\API\Approvals\ApprovalController;
use App\Presentation\Controllers\API\Auth\AuthController;
use App\Presentation\Controllers\API\Auth\UserController;
use App\Presentation\Controllers\API\CRM\CrmDashboardController;
use App\Presentation\Controllers\API\CRM\CustomerController;
use App\Presentation\Controllers\API\CRM\CustomerInteractionController;
use App\Presentation\Controllers\API\CRM\CustomerVehicleController;
use App\Presentation\Controllers\API\CRM\ReceivableController;
use App\Presentation\Controllers\API\CRM\PayableController;
use App\Presentation\Controllers\API\CRM\CrmPipelineController;
use App\Presentation\Controllers\API\CRM\SalesFollowUpController;
use App\Presentation\Controllers\API\CRM\SupplierController;
use App\Presentation\Controllers\API\CRM\VoucherController;
use App\Presentation\Controllers\API\CRM\CustomerProductPriceController;
use App\Presentation\Controllers\API\HR\AttendanceController;
use App\Presentation\Controllers\API\HR\EmployeeController;
use App\Presentation\Controllers\API\HR\LeaveController;
use App\Presentation\Controllers\API\HR\PayrollController;
use App\Presentation\Controllers\API\HR\PayrollItemController;
use App\Presentation\Controllers\API\HR\LateAttendancePenaltyController;
use App\Presentation\Controllers\API\HR\EmployeeLoanController;
use App\Presentation\Controllers\API\Inventory\AdjustmentController;
use App\Presentation\Controllers\API\Inventory\AssemblyController;
use App\Presentation\Controllers\API\Inventory\BranchController;
use App\Presentation\Controllers\API\Inventory\CategoryController;
use App\Presentation\Controllers\API\Inventory\InventoryValuationController;
use App\Presentation\Controllers\API\Inventory\ProductController;
use App\Presentation\Controllers\API\Inventory\ProductLabelController;
use App\Presentation\Controllers\API\Inventory\StockMovementController;
use App\Presentation\Controllers\API\Inventory\StocktakeController;
use App\Presentation\Controllers\API\Inventory\StockTransferController;
use App\Presentation\Controllers\API\Inventory\UnitController;
use App\Presentation\Controllers\API\Inventory\VehicleController;
use App\Presentation\Controllers\API\Inventory\WarehouseController;
use App\Presentation\Controllers\API\Inventory\BinLocationController;
use App\Presentation\Controllers\API\Inventory\BrandController;
use App\Presentation\Controllers\API\Inventory\InventoryReconciliationController;
use App\Presentation\Controllers\API\Inventory\StockWriteOffController;
use App\Presentation\Controllers\API\Accounting\ExpenseVoucherController;
use App\Presentation\Controllers\API\Partnerships\PartnerController;
use App\Presentation\Controllers\API\Partnerships\ProfitDistributionController;
use App\Presentation\Controllers\API\Portal\PartnerAuthController;
use App\Presentation\Controllers\API\Portal\PartnerDashboardController;
use App\Presentation\Controllers\API\Purchases\PurchaseController;
use App\Presentation\Controllers\API\Purchases\PurchaseReturnController;
use App\Presentation\Controllers\API\Purchases\SupplierPaymentAllocationController;
use App\Presentation\Controllers\API\Purchases\ProcurementController;
use App\Presentation\Controllers\API\Purchases\SupplierPriceListController;
use App\Presentation\Controllers\API\Purchases\SupplierCoreReturnController;
use App\Presentation\Controllers\API\Purchases\SupplierOrderController;
use App\Presentation\Controllers\API\Reports\ReportController;
use App\Presentation\Controllers\API\Reports\AutoPartsReportController;
use App\Presentation\Controllers\API\Sales\AdvancedSalesReportController;
use App\Presentation\Controllers\API\Sales\DeliveryController;
use App\Presentation\Controllers\API\Sales\InvoiceController;
use App\Presentation\Controllers\API\Sales\PosShiftController;
use App\Presentation\Controllers\API\Sales\QuotationController;
use App\Presentation\Controllers\API\Sales\SalesChannelController;
use App\Presentation\Controllers\API\Sales\SalesOrderController;
use App\Presentation\Controllers\API\Sales\SalesReturnController;
use App\Presentation\Controllers\API\Sales\ShippingController;
use App\Presentation\Controllers\API\Sales\WarrantyController;
use App\Presentation\Controllers\API\Sales\CustomerCoreReturnController;
use App\Presentation\Controllers\API\Sales\RmaController;
use App\Presentation\Controllers\API\Sales\WorkshopController;
use App\Presentation\Controllers\API\Sales\ZatcaOnboardingController;
use App\Presentation\Controllers\API\Settings\BackupController;
use App\Presentation\Controllers\API\Settings\WebhookController;
use App\Presentation\Controllers\API\SettingsController;
use App\Presentation\Controllers\API\Subscription\SubscriptionController;
use App\Presentation\Controllers\API\Treasury\ExpenseController;
use App\Presentation\Controllers\API\Treasury\TreasuryController;
use App\Presentation\Controllers\API\Tasks\TaskController;
use App\Presentation\Controllers\API\Inventory\ProductAliasController;
use App\Presentation\Controllers\API\Inventory\CrossReferenceController;
use App\Presentation\Controllers\API\Inventory\ProductImportExportController;
use App\Presentation\Controllers\API\Automation\WorkflowController;
use App\Presentation\Controllers\API\Sales\CommissionController;
use Illuminate\Support\Facades\Route;

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
Route::middleware(['tenant.auth', 'subscription.active', 'throttle:120,1'])->group(function () {

    Route::apiResource('roles', \App\Presentation\Controllers\API\Auth\RoleController::class);
    Route::get('permissions', [\App\Presentation\Controllers\API\Auth\PermissionController::class, 'index']);
    
    // Auth & Users
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/refresh', [AuthController::class, 'refresh']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::apiResource('users', UserController::class);

    // Sales / POS
    Route::prefix('sales')->group(function () {
        // Channels
        Route::post('/channels/upload-image', [SalesChannelController::class, 'uploadImage']);
        Route::apiResource('channels', SalesChannelController::class);

        Route::get('/invoices', [InvoiceController::class, 'index']);
        Route::post('/invoices/bulk', [InvoiceController::class, 'bulkStore'])->middleware('throttle:30,1');
        Route::post('/invoices', [InvoiceController::class, 'store'])->middleware('throttle:60,1');
        Route::get('/invoices/{id}', [InvoiceController::class, 'show']);
        Route::put('/invoices/{id}', [InvoiceController::class, 'update'])->middleware('throttle:60,1');
        Route::put('/invoices/{id}/status', [InvoiceController::class, 'updateStatus']);
        Route::get('/invoices/{id}/installments', [InvoiceController::class, 'getInstallments']);
        Route::post('/invoices/{id}/installments', [InvoiceController::class, 'saveInstallments']);
        Route::get('/reports/sales', [InvoiceController::class, 'salesReport']);

        // POS Shifts
        Route::get('/pos/shifts/current', [PosShiftController::class, 'current']);
        Route::post('/pos/shifts/open', [PosShiftController::class, 'open']);
        Route::post('/pos/shifts/close', [PosShiftController::class, 'close']);

        // POS Barcode Scanner — resolves barcode/SKU to a ready-to-add line item
        // {barcode} uses .+ so slashes/pluses in barcode strings are captured verbatim
        Route::get('/pos/scan/{barcode}', [PosShiftController::class, 'scanBarcode'])
            ->where('barcode', '.+')
            ->middleware('throttle:300,1');  // 300 scans / min per cashier

        // Advanced Sales Reports
        Route::get('/advanced-reports/kpis', [AdvancedSalesReportController::class, 'getDashboardKPIs']);
        Route::get('/advanced-reports/charts', [AdvancedSalesReportController::class, 'getDashboardCharts']);

        // Sales Returns
        Route::get('/returns', [SalesReturnController::class, 'index']);
        Route::post('/returns', [SalesReturnController::class, 'store']);
        Route::get('/returns/{id}', [SalesReturnController::class, 'show']);
        Route::put('/returns/{id}/status', [SalesReturnController::class, 'updateStatus']);

        // Customer Core Returns (core deposit refunds from customers)
        Route::get('/core-returns', [CustomerCoreReturnController::class, 'index']);
        Route::post('/core-returns', [CustomerCoreReturnController::class, 'store']);
        Route::get('/core-returns/{id}', [CustomerCoreReturnController::class, 'show']);
        Route::post('/core-returns/{id}/receive', [CustomerCoreReturnController::class, 'receive']);
        Route::post('/core-returns/{id}/credit', [CustomerCoreReturnController::class, 'credit']);

        // RMA Requests (Return Merchandise Authorization)
        Route::get('/rma/reason-categories', [RmaController::class, 'reasonCategories']);
        Route::get('/rma', [RmaController::class, 'index']);
        Route::post('/rma', [RmaController::class, 'store']);
        Route::get('/rma/{id}', [RmaController::class, 'show']);
        Route::post('/rma/{id}/under-review', [RmaController::class, 'markUnderReview']);
        Route::post('/rma/{id}/approve', [RmaController::class, 'approve']);
        Route::post('/rma/{id}/reject', [RmaController::class, 'reject']);
        Route::post('/rma/{id}/fulfill', [RmaController::class, 'fulfill']);
        Route::post('/rma/{id}/cancel', [RmaController::class, 'cancel']);

        // Workshop / Job Cards
        Route::get('/workshop/job-cards', [WorkshopController::class, 'index']);
        Route::post('/workshop/job-cards', [WorkshopController::class, 'store']);
        Route::get('/workshop/job-cards/{id}', [WorkshopController::class, 'show']);
        Route::put('/workshop/job-cards/{id}', [WorkshopController::class, 'update']);
        Route::post('/workshop/job-cards/{id}/convert-to-invoice', [WorkshopController::class, 'convertToInvoice']);

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
        Route::get('/quotations', [QuotationController::class, 'index']);
        Route::post('/quotations', [QuotationController::class, 'store']);
        Route::get('/quotations/{id}', [QuotationController::class, 'show']);
        Route::put('/quotations/{id}', [QuotationController::class, 'update']);
        Route::put('/quotations/{id}/status', [QuotationController::class, 'updateStatus']);

        // Sales Orders
        Route::get('/orders', [SalesOrderController::class, 'index']);
        Route::post('/orders', [SalesOrderController::class, 'store']);
        Route::get('/orders/{id}', [SalesOrderController::class, 'show']);
        Route::post('/orders/{id}/fulfill', [SalesOrderController::class, 'fulfill']);
        Route::post('/orders/{id}/cancel', [SalesOrderController::class, 'cancel']);

        // Shipping
        Route::get('/shipping', [ShippingController::class, 'index']);
        Route::post('/shipping', [ShippingController::class, 'store']);
        Route::get('/shipping/{id}', [ShippingController::class, 'show']);
        Route::put('/shipping/{id}', [ShippingController::class, 'update']);
        Route::put('/shipping/{id}/status', [ShippingController::class, 'updateStatus']);

        // Deliveries
        Route::get('/deliveries', [DeliveryController::class, 'index']);
        Route::post('/deliveries', [DeliveryController::class, 'store']);
        Route::get('/deliveries/map', [DeliveryController::class, 'getMapData']);
        Route::get('/deliveries/{id}', [DeliveryController::class, 'show']);
        Route::post('/deliveries/{id}/assign', [DeliveryController::class, 'assign']);
        Route::put('/deliveries/{id}/status', [DeliveryController::class, 'updateStatus']);
    });

    // Accounting
    Route::prefix('accounting')->group(function () {
        // Chart of Accounts
        Route::get('/accounts', [ChartOfAccountsController::class, 'index']);
        Route::get('/accounts/tree', [ChartOfAccountsController::class, 'tree']);
        Route::post('/accounts', [ChartOfAccountsController::class, 'store']);
        Route::put('/accounts/{id}', [ChartOfAccountsController::class, 'update']);
        Route::delete('/accounts/{id}', [ChartOfAccountsController::class, 'destroy']);

        // Journal Entries
        Route::get('/journal-entries', [JournalEntryController::class, 'index']);
        Route::post('/journal-entries', [JournalEntryController::class, 'store']);
        Route::get('/journal-entries/{id}', [JournalEntryController::class, 'show']);
        Route::post('/journal-entries/{id}/post', [JournalEntryController::class, 'post']);
        Route::post('/journal-entries/{id}/reverse', [JournalEntryController::class, 'reverse']);
    });

    // HR
    Route::prefix('hr')->group(function () {
        Route::get('/employees', [EmployeeController::class, 'index']);
        Route::post('/employees', [EmployeeController::class, 'store']);
        Route::get('/employees/{id}', [EmployeeController::class, 'show']);
        Route::put('/employees/{id}', [EmployeeController::class, 'update']);
        Route::delete('/employees/{id}', [EmployeeController::class, 'destroy']);
    });

    // Approvals
    Route::prefix('approvals')->group(function () {
        Route::get('/inbox', [ApprovalController::class, 'inbox']);
        Route::post('/{id}/approve', [ApprovalController::class, 'approve']);
        Route::post('/{id}/reject', [ApprovalController::class, 'reject']);
        Route::get('/rules', [ApprovalController::class, 'getRules']);
        Route::post('/rules', [ApprovalController::class, 'saveRule']);
    });

    // Treasury & Accounting
    Route::prefix('treasury')->group(function () {
        Route::get('/safes', [TreasuryController::class, 'getSafes']);
        Route::post('/safes', [TreasuryController::class, 'storeSafe']);
        Route::put('/safes/{id}', [TreasuryController::class, 'updateSafe']);
        Route::delete('/safes/{id}', [TreasuryController::class, 'destroySafe']);
        Route::post('/safes/{id}/assign-user', [TreasuryController::class, 'assignUser']);
        Route::get('/safes/{id}/transactions', [TreasuryController::class, 'getTransactions']);
        Route::post('/transactions', [TreasuryController::class, 'storeTransaction']);
        Route::post('/transfer', [TreasuryController::class, 'transfer']);
    });

    Route::prefix('expenses')->group(function () {
        Route::get('/categories', [ExpenseController::class, 'getCategories']);
        Route::post('/categories', [ExpenseController::class, 'storeCategory']);
        Route::get('/', [ExpenseController::class, 'index']);
        Route::post('/', [ExpenseController::class, 'store']);
        // Expense Vouchers (formal accounting vouchers)
        Route::post('/vouchers', [ExpenseVoucherController::class, 'store']);
        Route::post('/vouchers/{id}/approve', [ExpenseVoucherController::class, 'approve']);
    });

    // Reports
    Route::prefix('reports')->group(function () {
        Route::get('/pl', [ReportController::class, 'getProfitAndLoss']);
        Route::get('/inventory', [ReportController::class, 'getInventoryReport']);
        Route::get('/accounts', [ReportController::class, 'getAccountsReport']);
        Route::get('/kpis', [ReportController::class, 'getGeneralKpis']);
        Route::get('/vat-report', [ReportController::class, 'getVatReport']);
        Route::get('/aging', [ReportController::class, 'getAgingReport']);
        Route::get('/payables/reminders', [\App\Presentation\Controllers\API\Reports\PayablesReportController::class, 'getInstallmentReminders']);
        Route::get('/receivables/reminders', [\App\Presentation\Controllers\API\Reports\ReceivablesReportController::class, 'getInstallmentReminders']);


        // Auto Parts Specialized Reports
        Route::prefix('auto-parts')->group(function () {
            Route::get('/slow-moving',       [AutoPartsReportController::class, 'slowMovingParts']);
            Route::get('/top-by-make',       [AutoPartsReportController::class, 'topPartsByMake']);
            Route::get('/missing-parts',     [AutoPartsReportController::class, 'missingParts']);
            Route::get('/profit-by-brand',   [AutoPartsReportController::class, 'profitByBrand']);
            Route::get('/dead-stock-months', [AutoPartsReportController::class, 'deadStockByMonths']);
            Route::get('/turnover-by-make',  [AutoPartsReportController::class, 'turnoverByMake']);
            Route::get('/top-by-model',      [AutoPartsReportController::class, 'topPartsByModel']);
        });
    });

    // Advanced Analytics
    Route::prefix('analytics')->group(function () {
        Route::get('sales-performance', [AdvancedAnalyticsController::class, 'salesPerformance']);
        Route::get('profitability', [AdvancedAnalyticsController::class, 'profitabilityAnalysis']);
        Route::get('sales-by-channel', [AdvancedAnalyticsController::class, 'salesByChannel']);
        Route::get('returns-analysis', [AdvancedAnalyticsController::class, 'returnsAnalysis']);
        Route::get('customer-lifetime-value', [AdvancedAnalyticsController::class, 'customerLifetimeValue']);
        Route::get('discount-analysis', [AdvancedAnalyticsController::class, 'discountAnalysis']);
        Route::get('top-categories', [AdvancedAnalyticsController::class, 'topCategories']);
        Route::get('conversion-funnel', [AdvancedAnalyticsController::class, 'conversionFunnel']);
        Route::get('predictive-dashboard', [AnalyticsController::class, 'getPredictiveDashboard']);
    });

    // Inventory
    Route::prefix('inventory')->group(function () {
        // Branches & Warehouses
        Route::apiResource('branches', BranchController::class);
        Route::apiResource('warehouses', WarehouseController::class);

        // Categories, Units & Brands
        Route::apiResource('categories', CategoryController::class);
        Route::apiResource('units', UnitController::class);
        Route::apiResource('brands', BrandController::class);

        // Bin Locations
        Route::get('/bin-locations', [BinLocationController::class, 'index']);
        Route::post('/bin-locations', [BinLocationController::class, 'store']);
        Route::get('/bin-locations/tree', [BinLocationController::class, 'tree']);
        Route::get('/bin-locations/{id}', [BinLocationController::class, 'show']);
        Route::put('/bin-locations/{id}', [BinLocationController::class, 'update']);
        Route::delete('/bin-locations/{id}', [BinLocationController::class, 'destroy']);
        Route::post('/bin-locations/bulk-generate', [BinLocationController::class, 'bulkGenerate']);

        // Stock Transfers
        Route::get('/stock-transfers', [StockTransferController::class, 'index']);
        Route::post('/stock-transfers', [StockTransferController::class, 'store']);
        Route::get('/stock-transfers/{id}', [StockTransferController::class, 'show']);
        Route::post('/stock-transfers/{id}/approve', [StockTransferController::class, 'approve']);
        Route::post('/stock-transfers/{id}/receive', [StockTransferController::class, 'receive']);
        Route::delete('/stock-transfers/{id}', [StockTransferController::class, 'destroy']);

        // OEM / Cross-Reference lookup (قبل /products/{id} لتفادي تعارض الـ wildcard)
        Route::get('/cross-reference/lookup', [CrossReferenceController::class, 'lookup']);

        // Products
        Route::get('/products', [ProductController::class, 'index']);
        Route::post('/products', [ProductController::class, 'store']);
        Route::post('/products/upload-image', [ProductController::class, 'uploadImage']);
        Route::get('/products/search', [ProductController::class, 'search']);
        Route::get('/products/low-stock', [ProductController::class, 'lowStock']);
        Route::get('/products/barcode/{barcode}', [ProductController::class, 'scanBarcode']);
        Route::post('/products/labels', [ProductLabelController::class, 'bulk']);
        Route::get('/products/check-unique', [ProductController::class, 'checkUnique']);
        Route::post('/products/import', [ProductImportExportController::class, 'import']);
        Route::get('/products/imports/history', [ProductImportExportController::class, 'history']);
        Route::get('/products/{id}', [ProductController::class, 'show']);
        Route::put('/products/{id}', [ProductController::class, 'update']);
        Route::put('/products/{id}/bin-location', [ProductController::class, 'updateBinLocation']);
        Route::delete('/products/{id}', [ProductController::class, 'destroy']);
        Route::get('/products/{id}/label', [ProductLabelController::class, 'single']);
        Route::get('/products/{id}/resolve-price', [ProductController::class, 'resolvePrice']);

        // Product Aliases
        Route::get('/products/{id}/aliases', [ProductAliasController::class, 'index']);
        Route::post('/products/{id}/aliases', [ProductAliasController::class, 'store']);
        Route::put('/products/{id}/aliases/{aliasId}', [ProductAliasController::class, 'update']);
        Route::delete('/products/{id}/aliases/{aliasId}', [ProductAliasController::class, 'destroy']);
        Route::get('/products/{id}/resolve-alias', [ProductAliasController::class, 'resolveAlias']);
        Route::get('/products/{id}/customer-aliases', [ProductAliasController::class, 'indexCustomerAliases']);
        Route::post('/products/{id}/customer-aliases', [ProductAliasController::class, 'storeCustomerAlias']);
        Route::delete('/products/{id}/customer-aliases/{aliasId}', [ProductAliasController::class, 'destroyCustomerAlias']);

        // Product Cross-References
        Route::get('/products/{productId}/cross-references',            [CrossReferenceController::class, 'index']);
        Route::post('/products/{productId}/cross-references',           [CrossReferenceController::class, 'store']);
        Route::post('/products/{productId}/cross-references/bulk',      [CrossReferenceController::class, 'bulkStore']);
        Route::delete('/products/{productId}/cross-references/{refId}', [CrossReferenceController::class, 'destroy']);

        // Product Alternatives
        Route::get('/products/{id}/alternatives', [ProductController::class, 'getAlternatives']);
        Route::post('/products/{id}/alternatives', [ProductController::class, 'attachAlternative']);
        Route::delete('/products/{id}/alternatives/{alternativeId}', [ProductController::class, 'detachAlternative']);

        // Product Kits/Assemblies
        Route::get('/products/{id}/assemblies', [ProductController::class, 'getAssemblies']);
        Route::post('/products/{id}/assemblies', [ProductController::class, 'saveAssemblies']);

        // Stock Movements
        Route::get('/movements/summary', [StockMovementController::class, 'summary']);
        Route::get('/movements', [StockMovementController::class, 'index']);
        Route::post('/movements', [StockMovementController::class, 'store']);

        // Inventory Valuation & Reconciliation
        Route::get('/valuation', [InventoryValuationController::class, 'report']);
        Route::get('/reconciliation', [InventoryReconciliationController::class, 'generate']);

        // Stock Write-Offs (Scrap / Damaged / Obsolete)
        Route::get('/write-offs', [StockWriteOffController::class, 'index']);
        Route::post('/write-offs', [StockWriteOffController::class, 'store']);
        Route::get('/write-offs/{id}', [StockWriteOffController::class, 'show']);

        // Adjustments & Stocktakes
        Route::get('/adjustments', [AdjustmentController::class, 'index']);
        Route::post('/adjustments', [AdjustmentController::class, 'store']);
        Route::get('/adjustments/{id}', [AdjustmentController::class, 'show']);

        Route::get('/stocktakes', [StocktakeController::class, 'index']);
        Route::post('/stocktakes', [StocktakeController::class, 'store']);
        Route::get('/stocktakes/{id}', [StocktakeController::class, 'show']);
        Route::put('/stocktakes/{id}/status', [StocktakeController::class, 'updateStatus']);
        Route::put('/stocktakes/{id}/items', [StocktakeController::class, 'updateCounts']);
        Route::post('/stocktakes/{id}/approve', [StocktakeController::class, 'approve']);
        Route::post('/stocktakes/{id}/recount', [StocktakeController::class, 'requestRecount']);
        Route::get('/stocktakes/{id}/export', [StocktakeController::class, 'exportStocktakeSheet']);
        Route::post('/stocktakes/{id}/import', [StocktakeController::class, 'importStocktakeSheet']);
        Route::post('/stocktakes/{id}/add-item', [StocktakeController::class, 'addUnlistedItem']);
        Route::post('/stocktakes/{id}/scan', [StocktakeController::class, 'scanBarcode']);

        // Assembly (BOM)
        Route::get('/assembly/{productId}', [AssemblyController::class, 'getComponents']);
        Route::post('/assembly/{productId}', [AssemblyController::class, 'setComponents']);
        Route::post('/assemble', [AssemblyController::class, 'assemble']);

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
        Route::get('receivables/aging', [ReceivableController::class, 'agingReport']);
        Route::get('receivables/statement/{customerId}', [ReceivableController::class, 'statement']);
        Route::post('receivables/collect', [ReceivableController::class, 'collectPayment']);

        Route::get('payables/aging', [PayableController::class, 'agingReport']);
        Route::get('payables/statement/{supplierId}', [PayableController::class, 'statement']);

        Route::get('customers/export', [CustomerController::class, 'export']);
        Route::post('customers/import', [CustomerController::class, 'import']);
        Route::get('customers/{id}/statement', [CustomerController::class, 'statement']);

        // CRM Integration & Salesperson Tools
        Route::get('customers/{id}/insights', [CrmDashboardController::class, 'getCustomerInsights']);
        Route::post('customers/{id}/notes', [CustomerInteractionController::class, 'addNote']);
        Route::post('customers/{id}/interactions', [CustomerInteractionController::class, 'addInteraction']);

        Route::get('follow-ups', [SalesFollowUpController::class, 'index']);
        Route::post('follow-ups', [SalesFollowUpController::class, 'store']);
        Route::put('follow-ups/{id}/complete', [SalesFollowUpController::class, 'markCompleted']);

        // CRM Sales Pipeline (Kanban board)
        Route::get('pipeline/stages', [CrmPipelineController::class, 'stages']);
        Route::post('pipeline/deals', [CrmPipelineController::class, 'storeDeal']);
        Route::put('pipeline/deals/{id}/move', [CrmPipelineController::class, 'moveDeal']);

        // Customer Vehicles
        Route::get('customers/vehicles/search', [CustomerVehicleController::class, 'searchByPlate']);
        // Customer-Specific Product Prices
        Route::get('customer-prices/lookup', [CustomerProductPriceController::class, 'lookup']);
        Route::get('customers/{customerId}/prices', [CustomerProductPriceController::class, 'index']);
        Route::post('customers/{customerId}/prices', [CustomerProductPriceController::class, 'upsert']);
        Route::delete('customers/{customerId}/prices/{id}', [CustomerProductPriceController::class, 'destroy']);

        Route::get('customers/{customerId}/vehicles', [CustomerVehicleController::class, 'index']);
        Route::post('customers/{customerId}/vehicles', [CustomerVehicleController::class, 'store']);
        Route::put('customers/{customerId}/vehicles/{vehicleId}', [CustomerVehicleController::class, 'update']);
        Route::delete('customers/{customerId}/vehicles/{vehicleId}', [CustomerVehicleController::class, 'destroy']);
        Route::get('customers/{customerId}/vehicles/{vehicleId}/service-history', [CustomerVehicleController::class, 'serviceHistory']);
        Route::post('customers/{customerId}/vehicles/{vehicleId}/service-history', [CustomerVehicleController::class, 'addService']);

        Route::apiResource('customers', CustomerController::class);

        Route::post('vouchers', [VoucherController::class, 'store']);
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
        
        // Purchase Installments
        Route::get('/invoices/{id}/installments', [PurchaseController::class, 'getInstallments']);
        Route::post('/invoices/{id}/installments', [PurchaseController::class, 'saveInstallments']);
        Route::post('/installments/{id}/pay', [PurchaseController::class, 'payInstallment']);


        // Advanced Procurement Workflow
        Route::get('/requests', [ProcurementController::class, 'listRequests']);
        Route::post('/requests', [ProcurementController::class, 'storeRequest']);
        Route::put('/requests/{id}/status', [ProcurementController::class, 'updateRequestStatus']);
        Route::post('/requests/{id}/convert-to-po', [ProcurementController::class, 'convertToPO']);

        Route::get('/rfqs', [ProcurementController::class, 'listRFQs']);
        Route::post('/rfqs', [ProcurementController::class, 'storeRFQ']);

        Route::get('/orders', [ProcurementController::class, 'listOrders']);
        Route::post('/orders', [ProcurementController::class, 'storeOrder']);
        Route::put('/orders/{id}/status', [ProcurementController::class, 'updateOrderStatus']);

        // Purchase Returns
        Route::get('/returns', [PurchaseReturnController::class, 'index']);
        Route::post('/returns', [PurchaseReturnController::class, 'store']);
        Route::get('/returns/{id}', [PurchaseReturnController::class, 'show']);
        Route::put('/returns/{id}/status', [PurchaseReturnController::class, 'updateStatus']);

        // Supplier Core Returns
        Route::get('/core-returns', [SupplierCoreReturnController::class, 'index']);
        Route::post('/core-returns', [SupplierCoreReturnController::class, 'store']);
        Route::get('/core-returns/{id}', [SupplierCoreReturnController::class, 'show']);
        Route::post('/core-returns/{id}/ship', [SupplierCoreReturnController::class, 'ship']);
        Route::post('/core-returns/{id}/credit', [SupplierCoreReturnController::class, 'credit']);

        // Supplier Payment Allocations
        Route::get('/payments/{paymentId}/allocations', [SupplierPaymentAllocationController::class, 'index']);
        Route::post('/payments/{paymentId}/allocations', [SupplierPaymentAllocationController::class, 'store']);

        // Supplier Price Lists
        Route::prefix('supplier-prices')->group(function () {
            Route::get('/compare/{productId}',  [SupplierPriceListController::class, 'compareByProduct']);
            Route::post('/bulk',                [SupplierPriceListController::class, 'bulkImport']);
            Route::get('/',                     [SupplierPriceListController::class, 'index']);
            Route::post('/',                    [SupplierPriceListController::class, 'store']);
            Route::put('/{id}',                 [SupplierPriceListController::class, 'update']);
            Route::delete('/{id}',              [SupplierPriceListController::class, 'destroy']);
            Route::get('/{id}/history',         [SupplierPriceListController::class, 'getHistory']);
        });

        // Smart Order Scheduling System
        Route::prefix('order-schedules')->group(function () {
            Route::get('/',     [SupplierOrderController::class, 'getSchedules']);
            Route::post('/',    [SupplierOrderController::class, 'storeSchedule']);
            Route::delete('/{id}', [SupplierOrderController::class, 'destroySchedule']);
        });

        Route::post('/product-suppliers', [SupplierOrderController::class, 'setProductSupplier']);

        Route::prefix('smart-order')->group(function () {
            Route::get('/low-stock',   [SupplierOrderController::class, 'getLowStockGrouped']);
            Route::get('/upcoming',    [SupplierOrderController::class, 'getUpcomingOrders']);
            Route::post('/draft',      [SupplierOrderController::class, 'draftForSupplier']);
            Route::post('/draft-all',  [SupplierOrderController::class, 'draftAllSuppliers']);
        });
    });

    // ZATCA Integration onboarding
    Route::prefix('zatca')->group(function () {
        Route::post('/onboard', [ZatcaOnboardingController::class, 'submitOtp']);
        Route::get('/status', [ZatcaOnboardingController::class, 'status']);
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
        Route::post('/receipts', [TreasuryController::class, 'receipt']);
        Route::post('/payments', [TreasuryController::class, 'payment']);
        Route::post('/transfers', [TreasuryController::class, 'transfer']);
    });

    // Accounting & Reports
    Route::prefix('accounting')->group(function () {
        Route::get('/chart-of-accounts', [ReportsController::class, 'chartOfAccounts']);
        Route::get('/journal-entries', [ReportsController::class, 'journalEntries']);
        Route::get('/reports/trial-balance', [ReportsController::class, 'trialBalance']);
        Route::get('/reports/income-statement', [ReportsController::class, 'incomeStatement']);
        Route::get('/reports/balance-sheet', [ReportsController::class, 'balanceSheet']);
        Route::get('/reports/cash-flow', [ReportsController::class, 'cashFlow']);
        Route::get('/reports/general-ledger', [ReportsController::class, 'generalLedger']);
        Route::get('/reports/zakat', [ReportsController::class, 'zakatReport']);
        Route::post('/reports/zakat/post', [ReportsController::class, 'postZakatEntry']);
        Route::post('/reports/zakat/pay', [ReportsController::class, 'payZakat']);

        // Financial Reports — Accounting
        Route::get('/reports/customer-statement',          [FinancialReportsController::class, 'customerStatement']);
        Route::get('/reports/supplier-statement',          [FinancialReportsController::class, 'supplierStatement']);
        Route::get('/reports/account-statement',           [FinancialReportsController::class, 'accountStatement']);
        Route::get('/reports/fixed-asset-register',        [FinancialReportsController::class, 'fixedAssetRegister']);
        Route::get('/reports/monthly-pl',                  [FinancialReportsController::class, 'monthlyPnl']);
        Route::get('/reports/vat-detail',                  [FinancialReportsController::class, 'vatDetail']);
        Route::get('/reports/bank-position',               [FinancialReportsController::class, 'bankPosition']);
        Route::get('/reports/expense-analysis',            [FinancialReportsController::class, 'expenseAnalysis']);
        Route::get('/reports/depreciation-schedule',       [FinancialReportsController::class, 'depreciationScheduleAll']);
        Route::get('/reports/budget-utilization',          [FinancialReportsController::class, 'budgetUtilization']);
        Route::get('/reports/quarterly-vat',               [FinancialReportsController::class, 'quarterlyVat']);
        Route::get('/reports/dso',                         [FinancialReportsController::class, 'dso']);
        Route::get('/reports/dpo',                         [FinancialReportsController::class, 'dpo']);
        Route::get('/reports/credit-note-summary',         [FinancialReportsController::class, 'creditNoteSummary']);
        Route::get('/reports/bank-reconciliation-status',  [FinancialReportsController::class, 'bankReconciliationStatus']);
        Route::get('/reports/journal-audit',               [FinancialReportsController::class, 'journalAuditTrail']);
        Route::get('/reports/expense-voucher-summary',     [FinancialReportsController::class, 'expenseVoucherSummary']);

        // Financial Reports — Sales Analytics
        Route::get('/reports/revenue-analysis',            [SalesAnalyticsController::class, 'revenueAnalysis']);
        Route::get('/reports/gross-margin',                [SalesAnalyticsController::class, 'grossMarginByProduct']);
        Route::get('/reports/inventory-aging',             [SalesAnalyticsController::class, 'inventoryAging']);
        Route::get('/reports/customer-profitability',      [SalesAnalyticsController::class, 'customerProfitability']);
        Route::get('/reports/purchases-analysis',          [SalesAnalyticsController::class, 'purchasesAnalysis']);
        Route::get('/reports/sales-rep-performance',       [SalesAnalyticsController::class, 'salesRepPerformance']);
        Route::get('/reports/return-rate',                 [SalesAnalyticsController::class, 'returnRateByProduct']);

        // Fixed Assets
        Route::apiResource('fixed-assets', FixedAssetController::class);
        Route::post('fixed-assets/{id}/depreciate', [FixedAssetController::class, 'calculateDepreciation']);
        Route::get('fixed-assets/{id}/depreciation-schedule', [FixedAssetController::class, 'depreciationSchedule']);
        Route::post('fixed-assets/{id}/dispose', [FixedAssetController::class, 'dispose']);

        // Account Mappings
        Route::get('/account-mappings', [AccountingSettingsController::class, 'getAccountMappings']);
        Route::put('/account-mappings', [AccountingSettingsController::class, 'updateAccountMappings']);

        // Opening Balances
        Route::get('/opening-balances', [OpeningBalanceController::class, 'index']);
        Route::post('/opening-balances/account', [OpeningBalanceController::class, 'setAccountBalance']);
        Route::post('/opening-balances/customer', [OpeningBalanceController::class, 'setCustomerBalance']);
        Route::post('/opening-balances/supplier', [OpeningBalanceController::class, 'setSupplierBalance']);

        // Fiscal Periods
        Route::get('/fiscal-periods', [AccountingSettingsController::class, 'listFiscalPeriods']);
        Route::post('/fiscal-periods', [AccountingSettingsController::class, 'createFiscalPeriod']);
        Route::post('/fiscal-periods/{id}/close', [AccountingSettingsController::class, 'closeFiscalPeriod']);
        Route::post('/fiscal-periods/{id}/close-year', [AccountingSettingsController::class, 'closeFiscalYear']);
        Route::post('/fiscal-periods/{id}/reopen', [AccountingSettingsController::class, 'reopenFiscalPeriod']);

        // Bank Accounts & Reconciliations
        Route::apiResource('bank-accounts', BankAccountController::class);
        Route::post('bank-accounts/{id}/import-transactions', [BankAccountController::class, 'importTransactions']);
        Route::post('bank-accounts/{id}/reconciliations', [BankAccountController::class, 'startReconciliation']);
        Route::get('bank-accounts/{id}/reconciliations', [BankAccountController::class, 'getReconciliations']);
        Route::post('reconciliations/{id}/match', [BankAccountController::class, 'matchTransaction']);
        Route::post('reconciliations/{id}/complete', [BankAccountController::class, 'completeReconciliation']);

        // Credit Notes
        Route::get('credit-notes', [CreditNoteController::class, 'index']);
        Route::post('credit-notes', [CreditNoteController::class, 'store']);
        Route::post('credit-notes/{id}/apply', [CreditNoteController::class, 'apply']);

        // Budgets
        Route::get('budgets', [BudgetController::class, 'index']);
        Route::post('budgets', [BudgetController::class, 'store']);
        Route::get('budgets/{id}', [BudgetController::class, 'show']);
        Route::put('budgets/{id}', [BudgetController::class, 'update']);
        Route::delete('budgets/{id}', [BudgetController::class, 'destroy']);
        Route::post('budgets/{id}/approve', [BudgetController::class, 'approve']);
        Route::get('budgets/{id}/variance', [BudgetController::class, 'variance']);

        // Bank Auto-Matching
        Route::post('reconciliations/{id}/auto-match', [BankAccountController::class, 'autoMatch']);

        // Cost Centers
        Route::get('cost-centers', [CostCenterController::class, 'index']);
        Route::get('cost-centers/flat', [CostCenterController::class, 'flat']);
        Route::post('cost-centers', [CostCenterController::class, 'store']);
        Route::get('cost-centers/{id}', [CostCenterController::class, 'show']);
        Route::put('cost-centers/{id}', [CostCenterController::class, 'update']);
        Route::delete('cost-centers/{id}', [CostCenterController::class, 'destroy']);
        Route::get('cost-centers-report', [CostCenterController::class, 'report']);

        // Recurring Journal Entries
        Route::get('recurring-journal-entries', [RecurringJournalEntryController::class, 'index']);
        Route::post('recurring-journal-entries', [RecurringJournalEntryController::class, 'store']);
        Route::get('recurring-journal-entries/{id}', [RecurringJournalEntryController::class, 'show']);
        Route::put('recurring-journal-entries/{id}', [RecurringJournalEntryController::class, 'update']);
        Route::delete('recurring-journal-entries/{id}', [RecurringJournalEntryController::class, 'destroy']);
        Route::post('recurring-journal-entries/{id}/post-now', [RecurringJournalEntryController::class, 'postNow']);
    });

    // Settings
    Route::get('/settings', [SettingsController::class, 'index']);
    Route::put('/settings', [SettingsController::class, 'update']);
    Route::post('/settings/hr-manager-email', [SettingsController::class, 'updateHrManagerEmail']);

    // Webhooks
    Route::prefix('webhooks')->group(function () {
        Route::get('/', [WebhookController::class, 'index']);
        Route::post('/', [WebhookController::class, 'store']);
        Route::get('/{id}', [WebhookController::class, 'show']);
        Route::put('/{id}', [WebhookController::class, 'update']);
        Route::delete('/{id}', [WebhookController::class, 'destroy']);
        Route::get('/{id}/logs', [WebhookController::class, 'getLogs']);
    });

    // Backups
    Route::prefix('backups')->group(function () {
        Route::get('/', [BackupController::class, 'index']);
        Route::post('/', [BackupController::class, 'store'])->middleware('throttle:3,60');
        Route::get('/{id}', [BackupController::class, 'show']);
        Route::get('/{id}/download', [BackupController::class, 'download']);
        Route::post('/{id}/restore', [BackupController::class, 'restore'])->middleware('throttle:3,60');
    });

    // HR & Payroll
    Route::prefix('hr')->group(function () {
        Route::get('/employees', [EmployeeController::class, 'index']);
        Route::post('/employees', [EmployeeController::class, 'store']);
        Route::get('/employees/{id}', [EmployeeController::class, 'show']);
        Route::put('/employees/{id}', [EmployeeController::class, 'update']);
        Route::delete('/employees/{id}', [EmployeeController::class, 'destroy']);

        Route::get('/attendance', [AttendanceController::class, 'index']);
        Route::post('/attendance/check-in', [AttendanceController::class, 'checkIn']);
        Route::post('/attendance/check-out', [AttendanceController::class, 'checkOut']);
        Route::put('/attendance/{id}/status', [AttendanceController::class, 'updateStatus']);

        Route::get('/leaves', [LeaveController::class, 'index']);
        Route::post('/leaves', [LeaveController::class, 'store']);
        Route::put('/leaves/{id}/status', [LeaveController::class, 'updateStatus']);

        Route::get('/payroll', [PayrollController::class, 'index']);
        Route::post('/payroll/generate', [PayrollController::class, 'generate']);
        Route::post('/payroll/{id}/pay', [PayrollController::class, 'markAsPaid']);

        // Payroll Items (بنود الراتب)
        Route::get('/payroll-items',          [PayrollItemController::class, 'index']);
        Route::post('/payroll-items',         [PayrollItemController::class, 'store']);
        Route::delete('/payroll-items/{id}',  [PayrollItemController::class, 'destroy']);

        // Payslip
        Route::get('/payroll/{payrollId}/payslip', [PayrollItemController::class, 'getPayslip']);
        Route::post('/payroll/{payrollId}/sign',   [PayrollItemController::class, 'recordSignature']);

        // Penalty Rules
        Route::get('/penalty-rules',       [LateAttendancePenaltyController::class, 'getRules']);
        Route::post('/penalty-rules',      [LateAttendancePenaltyController::class, 'storeRule']);
        Route::put('/penalty-rules/{id}',  [LateAttendancePenaltyController::class, 'updateRule']);
        Route::delete('/penalty-rules/{id}',[LateAttendancePenaltyController::class, 'destroyRule']);
        Route::get('/penalty-report',      [LateAttendancePenaltyController::class, 'getPenaltyReport']);

        // Employee Loans
        Route::get('/loans/summary',                    [EmployeeLoanController::class, 'getSummary']);
        Route::get('/loans',                            [EmployeeLoanController::class, 'index']);
        Route::post('/loans',                           [EmployeeLoanController::class, 'store']);
        Route::get('/loans/{id}',                       [EmployeeLoanController::class, 'show']);
        Route::put('/loans/{id}/status',                [EmployeeLoanController::class, 'updateStatus']);
        Route::put('/loan-installments/{id}/skip',      [EmployeeLoanController::class, 'skipInstallment']);
    });

    // Data Import & Export
    Route::prefix('data')->group(function () {
        Route::get('template', [\App\Presentation\Controllers\API\DataImportExportController::class, 'downloadTemplate']);
        Route::get('export', [\App\Presentation\Controllers\API\DataImportExportController::class, 'exportData']);
        Route::post('import', [\App\Presentation\Controllers\API\DataImportExportController::class, 'importData']);
    });

    // AI & Forecasting Analytics
    Route::prefix('forecasting')->group(function () {
        Route::get('/inventory-forecast', [ForecastingController::class, 'getInventoryForecast']);
        Route::post('/auto-draft-po', [ForecastingController::class, 'autoDraftPurchaseOrder']);
        Route::get('/partner-forecast', [ForecastingController::class, 'getPartnerForecast']);
    });

    Route::prefix('analytics')->group(function () {
        Route::post('chat', [\App\Presentation\Controllers\API\Analytics\AIChatbotController::class, 'chat']);
    });

    // Admin: Partner Portal Management
    Route::prefix('partnerships')->group(function () {
        Route::post('/partners/{id}/enable-portal', [PartnerController::class, 'enablePortal']);
        Route::post('/partners/{id}/send-magic-link', [PartnerController::class, 'sendMagicLink']);
    });

    // Subscriptions
    Route::prefix('subscriptions')->group(function () {
        Route::get('/current', [SubscriptionController::class, 'current']);
        Route::post('/checkout', [SubscriptionController::class, 'checkout']);
    });

    // Tasks
    Route::prefix('tasks')->group(function () {
        Route::get('/dashboard',         [TaskController::class, 'getDashboard']);
        Route::get('/categories',        [TaskController::class, 'getCategories']);
        Route::get('/',                  [TaskController::class, 'index']);
        Route::post('/',                 [TaskController::class, 'store']);
        Route::post('/reorder',          [TaskController::class, 'reorder']);
        Route::put('/{id}',              [TaskController::class, 'update']);
        Route::patch('/{id}/status',     [TaskController::class, 'updateStatus']);
        Route::delete('/{id}',           [TaskController::class, 'destroy']);
        Route::post('/{id}/comments',    [TaskController::class, 'addComment']);
    });
});

// ─────────────────────────────────────────────────────────────
//  Automation — Workflow rules engine
// ─────────────────────────────────────────────────────────────
Route::middleware(['tenant.auth', 'subscription.active'])->prefix('automation')->group(function () {
    Route::get('/workflows', [WorkflowController::class, 'index']);
    Route::post('/workflows', [WorkflowController::class, 'store']);
    Route::get('/workflows/{id}', [WorkflowController::class, 'show']);
    Route::put('/workflows/{id}', [WorkflowController::class, 'update'])->name('workflows.update');
    Route::delete('/workflows/{id}', [WorkflowController::class, 'destroy']);
});

// ─────────────────────────────────────────────────────────────
//  Commissions — Sales commission tracking and payouts
// ─────────────────────────────────────────────────────────────
Route::middleware(['tenant.auth', 'subscription.active'])->prefix('sales/commissions')->group(function () {
    Route::get('/unpaid', [CommissionController::class, 'unpaid']);
    Route::post('/payout', [CommissionController::class, 'payout']);
});

// ─────────────────────────────────────────────────────────────
//  Partner Portal — Separate auth, tenant-scoped via query param
// ─────────────────────────────────────────────────────────────
Route::middleware(['tenant'])->prefix('portal')->group(function () {
    // Public portal auth (throttled — public, tenant-scoped auth surface)
    Route::post('/login', [PartnerAuthController::class, 'login'])->middleware('throttle:10,1');
    Route::post('/magic-link', [PartnerAuthController::class, 'sendMagicLink'])->middleware('throttle:10,1');
    Route::post('/magic-link/verify', [PartnerAuthController::class, 'verifyMagicLink'])->middleware('throttle:10,1');

    // Protected portal routes (partner token required)
    Route::middleware(['partner.auth'])->group(function () {
        Route::get('/me', [PartnerAuthController::class, 'me']);
        Route::post('/logout', [PartnerAuthController::class, 'logout']);
        Route::get('/dashboard', [PartnerDashboardController::class, 'dashboard']);
        Route::get('/profits', [PartnerDashboardController::class, 'profits']);
        Route::get('/statement', [PartnerDashboardController::class, 'statement']);
        Route::get('/statement/pdf', [PartnerDashboardController::class, 'exportPdf']);
        Route::get('/top-products', [PartnerDashboardController::class, 'topProducts']);
        Route::get('/forecast', [PartnerDashboardController::class, 'forecast']);
    });
});
