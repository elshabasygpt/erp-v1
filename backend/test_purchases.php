<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Infrastructure\Eloquent\Models\SupplierModel;
use App\Infrastructure\Eloquent\Models\WarehouseModel;
use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Presentation\Controllers\API\Purchases\PurchaseController;
use App\Presentation\Controllers\API\Purchases\PurchaseReturnController;
use Illuminate\Http\Request;

echo "--- Starting Advanced Purchases & Returns Test ---\n";

$warehouse = WarehouseModel::first();
$product = ProductModel::first();
$supplier = SupplierModel::first();

if (!$warehouse || !$product || !$supplier) {
    echo "Missing base data\n";
    exit;
}

$initialBalance = $supplier->balance;
echo "Supplier: {$supplier->name} | Initial Balance: {$initialBalance}\n";

// 1. Create a Credit Purchase Invoice (Should INCREASE supplier balance because we owe them)
$purchaseReq = new Request([
    'supplier_id' => $supplier->id,
    'warehouse_id' => $warehouse->id,
    'issue_date' => date('Y-m-d'),
    'status' => 'confirmed',
    'payment_type' => 'credit',
    'items' => [
        [
            'product_id' => $product->id,
            'quantity' => 10,
            'unit_price' => 100, // Subtotal 1000
            'tax_rate' => 15 // Tax 150 -> Total = 1150
        ]
    ]
]);

$purchaseController = app(PurchaseController::class);
$res = $purchaseController->store($purchaseReq);

if ($res->getStatusCode() !== 201) {
    echo "[FAIL] Purchase Creation: " . json_encode($res->getData()) . "\n";
    exit;
}
$invoice = $res->getData()->data;
echo "[OK] Created Credit Purchase Invoice. Total Amount: {$invoice->total}\n";

$supplier->refresh();
echo "New Supplier Balance (Expected: ".($initialBalance + 1150).", Actual: {$supplier->balance})\n";

// 2. Create a Purchase Return (Should DECREASE supplier balance because we return goods)
$returnReq = new Request([
    'supplier_id' => $supplier->id,
    'warehouse_id' => $warehouse->id,
    'purchase_invoice_id' => $invoice->id,
    'issue_date' => date('Y-m-d'),
    'status' => 'completed',
    'items' => [
        [
            'product_id' => $product->id,
            'quantity' => 2, // Returning 2 units
            'unit_price' => 100, // Subtotal 200
            'tax_rate' => 15 // Tax 30 -> Total 230
        ]
    ]
]);

$returnController = app(PurchaseReturnController::class);
$resReturn = $returnController->store($returnReq);

if ($resReturn->getStatusCode() !== 201) {
    echo "[FAIL] Return Creation: " . json_encode($resReturn->getData()) . "\n";
    exit;
}

$supplier->refresh();
echo "[OK] Created Completed Purchase Return. Returned 2 units (Total 230)\n";
echo "Final Supplier Balance (Expected: ".($initialBalance + 1150 - 230).", Actual: {$supplier->balance})\n";

echo "--- Test Completed ---\n";
