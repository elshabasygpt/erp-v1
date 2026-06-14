<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Infrastructure\Eloquent\Models\CustomerModel;
use App\Infrastructure\Eloquent\Models\WarehouseModel;
use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\WarehouseProductModel;
use App\Infrastructure\Eloquent\Models\StockMovementModel;
use App\Presentation\Controllers\API\Sales\InvoiceController;
use App\Presentation\Controllers\API\Sales\SalesReturnController;
use Illuminate\Http\Request;

echo "--- Starting Advanced Sales Programmatic Verification ---\n";

$warehouse = WarehouseModel::first();
$product = ProductModel::first();
$customer = CustomerModel::first();

if (!$warehouse || !$product || !$customer) {
    echo "Missing base data\n";
    exit;
}

$initialBalance = $customer->balance;
$wp = WarehouseProductModel::where(['warehouse_id' => $warehouse->id, 'product_id' => $product->id])->first();
$initialStock = $wp ? $wp->quantity : 0;

echo "Customer: {$customer->name} | Initial Balance (Debt): {$initialBalance}\n";
echo "Product: {$product->name} | Initial Stock: {$initialStock}\n\n";

if ($initialStock < 5) {
    echo "Need more stock to perform test! Simulating +100 stock.\n";
    $wp->quantity += 100;
    $wp->save();
    $initialStock += 100;
}

// 1. Create a Draft Sales Invoice
$invoiceReq = new Request([
    'customer_id' => $customer->id,
    'warehouse_id' => $warehouse->id,
    'type' => 'credit',
    'status' => 'draft',
    'items' => [
        [
            'product_id' => $product->id,
            'quantity' => 2,
            'unit_price' => 500, // Subtotal 1000, Tax 150 = 1150
            'vat_rate' => 15,
            'discount_percent' => 0
        ]
    ]
]);

$controller = app(InvoiceController::class);
$res = $controller->store($invoiceReq);
if ($res->getStatusCode() !== 201) {
    echo "[FAIL] Draft Creation: " . json_encode($res->getData()) . "\n";
    exit;
}
$invoice = $res->getData()->data;
echo "[OK] Draft Sales Invoice Created. ID: {$invoice->id}\n";

// Ensure balance and stock did NOT change!
$customer->refresh();
$wp->refresh();
if ((float)$customer->balance !== (float)$initialBalance) { echo "[FAIL] Customer balance changed on draft!\n"; exit; }
if ((float)$wp->quantity !== (float)$initialStock) { echo "[FAIL] Stock changed on draft!\n"; exit; }
echo "[OK] Debt and Stock unchanged on draft.\n\n";


// 2. Confirm the Invoice
$statusReq = new Request(['status' => 'confirmed']);
$resStatus = $controller->updateStatus($statusReq, $invoice->id);
if ($resStatus->getStatusCode() !== 200) {
    echo "[FAIL] Status Update: " . json_encode($resStatus->getData()) . "\n";
    exit;
}
echo "[OK] Sales Invoice Confirmed.\n";

$customer->refresh();
$wp->refresh();
$expectedBalance = $initialBalance + 1150; // Customer owes us more
$expectedStock = $initialStock - 2;

if ((float)$customer->balance !== (float)$expectedBalance) {
    echo "[FAIL] Balance mismatch. Expected {$expectedBalance}, Got {$customer->balance}\n"; 
} else {
    echo "[OK] Customer debt correctly increased to {$customer->balance}\n";
}

if ((float)$wp->quantity !== (float)$expectedStock) {
    echo "[FAIL] Stock mismatch. Expected {$expectedStock}, Got {$wp->quantity}\n"; 
} else {
    echo "[OK] Stock quantity correctly deduced to {$wp->quantity}\n";
}

$movement = StockMovementModel::where('reference_id', $invoice->id)->first();
if (!$movement || $movement->type !== 'out' || $movement->quantity != -2) {
    echo "[FAIL] Stock movement record missing or incorrect.\n";
} else {
    echo "[OK] Stock movement recorded properly: TYPE={$movement->type}, QTY={$movement->quantity}\n\n";
}

// 3. Create Sales Return for 1 item (500 + 15% VAT = 575 refund)
$returnReq = new Request([
    'customer_id' => $customer->id,
    'warehouse_id' => $warehouse->id,
    'invoice_id' => $invoice->id,
    'status' => 'completed',
    'items' => [
        [
            'product_id' => $product->id,
            'quantity' => 1,
            'unit_price' => 500, // Total 575
            'vat_rate' => 15
        ]
    ]
]);

$returnController = app(SalesReturnController::class);
$resRet = $returnController->store($returnReq);
if ($resRet->getStatusCode() !== 201) {
    echo "[FAIL] Return Creation: " . json_encode($resRet->getData()) . "\n";
    exit;
}
echo "[OK] Completed Sales Return Created.\n";

$customer->refresh();
$wp->refresh();
$expectedBalance2 = $expectedBalance - 575;
$expectedStock2 = $expectedStock + 1;

if ((float)$customer->balance !== (float)$expectedBalance2) {
    echo "[FAIL] Customer balance mismatch after return. Expected {$expectedBalance2}, Got {$customer->balance}\n"; 
} else {
    echo "[OK] Customer debt correctly refunded/decreased to {$customer->balance}\n";
}

if ((float)$wp->quantity !== (float)$expectedStock2) {
    echo "[FAIL] Stock mismatch after return. Expected {$expectedStock2}, Got {$wp->quantity}\n"; 
} else {
    echo "[OK] Stock quantity correctly returned to warehouse: {$wp->quantity}\n";
}

echo "\n--- All Sales Tests Passed Successfully ---\n";
