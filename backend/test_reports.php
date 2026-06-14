<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Presentation\Controllers\API\Reports\ReportController;
use Illuminate\Http\Request;

echo "--- Starting Reports API Verification ---\n";

$reportController = app(ReportController::class);

echo "\n1. Testing Profit & Loss...\n";
$resPL = $reportController->getProfitAndLoss(new Request());
$pl = $resPL->getData()->data;
echo "   Sales: {$pl->revenues->sales}\n";
echo "   Expenses: {$pl->expenses->operating_expenses} (Op), {$pl->expenses->purchases} (Purchases)\n";
echo "   NET INCOME: {$pl->net_income}\n";

echo "\n2. Testing Inventory Report...\n";
$resInv = $reportController->getInventoryReport(new Request());
$inv = $resInv->getData()->data;
echo "   Total Items Count: {$inv->total_items}\n";
echo "   Total Inventory Value (Cost/Price): {$inv->estimated_inventory_value}\n";
echo "   Low Stock Alerts Count: " . count($inv->low_stock_alerts) . "\n";

echo "\n3. Testing Accounts (Treasury)...\n";
$resAcct = $reportController->getAccountsReport(new Request());
$acct = $resAcct->getData()->data;
echo "   Safes Count: " . count($acct->safes) . "\n";
echo "   Total Liquidity: {$acct->total_liquidity}\n";
echo "   Recent Transactions Count: " . count($acct->recent_transactions) . "\n";

echo "\n4. Testing General KPIs...\n";
$resKpis = $reportController->getGeneralKpis(new Request());
$kpi = $resKpis->getData()->data;
$summary = $kpi->summary;
echo "   Total Sales: {$summary->total_sales}\n";
echo "   Total Purchases: {$summary->total_purchases}\n";
echo "   Total Products: {$summary->total_products}\n";
echo "   Total Customers: {$summary->total_customers}\n";

echo "\n--- All Report logic tested successfully! ---\n";
