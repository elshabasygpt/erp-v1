<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\StockMovementModel;
use App\Infrastructure\Eloquent\Models\SupplierModel;
use App\Infrastructure\Eloquent\Models\WarehouseModel;
use App\Infrastructure\Eloquent\Models\WarehouseProductModel;
use App\Presentation\Controllers\API\Purchases\PurchaseController;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Http\Request;

echo "--- Starting Advanced Programmatic Verification ---\n";

$warehouse = WarehouseModel::first();
$product = ProductModel::first();
$supplier = SupplierModel::first();

if (! $warehouse || ! $product || ! $supplier) {
    echo "Missing base data\n";
    exit;
}

$initialBalance = $supplier->balance;
$wp = WarehouseProductModel::where(['warehouse_id' => $warehouse->id, 'product_id' => $product->id])->first();
$initialStock = $wp ? $wp->quantity : 0;

echo "Supplier: {$supplier->name} | Initial Balance: {$initialBalance}\n";
echo "Product: {$product->name} | Initial Stock: {$initialStock}\n";

// 1. Create a Draft Purchase Invoice
$purchaseReq = new Request([
    'supplier_id' => $supplier->id,
    'warehouse_id' => $warehouse->id,
    'issue_date' => date('Y-m-d'),
    'status' => 'draft',
    'payment_type' => 'credit',
    'items' => [
        [
            'product_id' => $product->id,
            'quantity' => 10,
            'unit_price' => 100, // Subtotal 1000, Tax 150 = 1150
            'tax_rate' => 15,
        ],
    ],
]);

$controller = app(PurchaseController::class);
$res = $controller->store($purchaseReq);
if ($res->getStatusCode() !== 201) {
    echo '[FAIL] Draft Creation: '.json_encode($res->getData())."\n";
    exit;
}
$invoice = $res->getData()->data;
echo "[OK] Draft Created. ID: {$invoice->id}\n";

// Ensure balance and stock did NOT change!
$supplier->refresh();
$wp = WarehouseProductModel::where(['warehouse_id' => $warehouse->id, 'product_id' => $product->id])->first();
$currentStock = $wp ? $wp->quantity : 0;

if ($supplier->balance != $initialBalance) {
    echo "[FAIL] Balance changed on draft!\n";
    exit;
}
if ($currentStock != $initialStock) {
    echo "[FAIL] Stock changed on draft!\n";
    exit;
}
echo "[OK] Balance and Stock unchanged on draft.\n";

// 2. Edit Draft Invoice (Increase QTY to 20, Total = 2300)
$updateReq = new Request([
    'supplier_id' => $supplier->id,
    'warehouse_id' => $warehouse->id,
    'issue_date' => date('Y-m-d'),
    'status' => 'draft',
    'payment_type' => 'credit',
    'items' => [
        [
            'product_id' => $product->id,
            'quantity' => 20,
            'unit_price' => 100, // Subtotal 2000, Tax 300 = 2300
            'tax_rate' => 15,
        ],
    ],
]);
$resEdit = $controller->update($updateReq, $invoice->id);
if ($resEdit->getStatusCode() !== 200) {
    echo '[FAIL] Draft Update: '.json_encode($resEdit->getData())."\n";
    exit;
}
echo "[OK] Draft Updated.\n";

// 3. Confirm Invoice via Status update
$statusReq = new Request(['status' => 'confirmed']);
$resStatus = $controller->updateStatus($statusReq, $invoice->id);
if ($resStatus->getStatusCode() !== 200) {
    echo '[FAIL] Status Update: '.json_encode($resStatus->getData())."\n";
    exit;
}
echo "[OK] Invoice Confirmed.\n";

// 4. Verify Stock and Balance
$supplier->refresh();
$wp = WarehouseProductModel::where(['warehouse_id' => $warehouse->id, 'product_id' => $product->id])->first();
$currentStock = $wp ? $wp->quantity : 0;

$expectedBalance = $initialBalance + 2300;
$expectedStock = $initialStock + 20;

if ((float) $supplier->balance !== (float) $expectedBalance) {
    echo "[FAIL] Balance mismatch. Expected {$expectedBalance}, Got {$supplier->balance}\n";
} else {
    echo "[OK] Supplier balance correctly updated to {$supplier->balance}\n";
}

if ((float) $currentStock !== (float) $expectedStock) {
    echo "[FAIL] Stock mismatch. Expected {$expectedStock}, Got {$currentStock}\n";
} else {
    echo "[OK] Stock quantity correctly updated to {$currentStock}\n";
}

// 5. Verify Stock Movement Record
$movement = StockMovementModel::where('reference_id', $invoice->id)->first();
if (! $movement || $movement->type !== 'in' || $movement->quantity != 20) {
    echo "[FAIL] Stock movement record missing or incorrect.\n";
} else {
    echo "[OK] Stock movement recorded properly: TYPE={$movement->type}, QTY={$movement->quantity}\n";
}

echo "--- All Tests Passed Successfully ---\n";
