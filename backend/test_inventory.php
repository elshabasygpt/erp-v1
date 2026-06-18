<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

use App\Infrastructure\Eloquent\Models\ProductComponentModel;
use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\WarehouseModel;
use App\Infrastructure\Eloquent\Models\WarehouseProductModel;
use App\Presentation\Controllers\API\Inventory\AdjustmentController;
use App\Presentation\Controllers\API\Inventory\AssemblyController;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

echo "--- Starting Advanced Inventory Programmatic Test ---\n";

// 1. Get warehouse and products
$warehouse = WarehouseModel::first();
if (! $warehouse) {
    echo "[!] No warehouse found in tenant DB\n";
    exit;
}

$product = ProductModel::first();
if (! $product) {
    echo "[!] No product found in tenant DB\n";
    exit;
}

echo "Testing with Product: {$product->name}\n";
echo "Warehouse: {$warehouse->name}\n";

// Ensure some mock items for components
$component1 = ProductModel::skip(1)->first();
$component2 = ProductModel::skip(2)->first();

if (! $component1 || ! $component2) {
    echo "[!] Not enough products for assembly test\n";
    exit;
}

echo "Component 1: {$component1->name}\n";
echo "Component 2: {$component2->name}\n";

// 2. Setup BOM
DB::connection('tenant')->beginTransaction();
try {
    ProductComponentModel::where('parent_product_id', $product->id)->delete();

    // 2x Component 1 + 1x Component 2 = 1x Finished Product
    ProductComponentModel::create([
        'parent_product_id' => $product->id,
        'child_product_id' => $component1->id,
        'quantity_required' => 2,
    ]);
    ProductComponentModel::create([
        'parent_product_id' => $product->id,
        'child_product_id' => $component2->id,
        'quantity_required' => 1,
    ]);

    DB::connection('tenant')->commit();
    echo "[OK] BOM Setup completed.\n";
} catch (Exception $e) {
    echo '[FAIL] BOM Setup: '.$e->getMessage()."\n";
    DB::connection('tenant')->rollBack();
}

// 3. Set initial raw material stock via Adjustment (Spoilage/Reconciliation)
$adjReq = new Request([
    'warehouse_id' => $warehouse->id,
    'type' => 'reconciliation',
    'date' => date('Y-m-d'),
    'notes' => 'Test init raw materials',
    'items' => [
        ['product_id' => $component1->id, 'actual_quantity' => 10], // we need 2 per assembly -> enough for 5
        ['product_id' => $component2->id, 'actual_quantity' => 10], // we need 1 per assembly -> enough for 10
        ['product_id' => $product->id, 'actual_quantity' => 0],      // Finished good 0
    ],
]);

$adjController = app(AdjustmentController::class);
try {
    $res = $adjController->store($adjReq);
    if ($res->getStatusCode() == 201) {
        echo "[OK] Initial Adjustment Setup completed.\n";
    } else {
        echo '[FAIL] Init Adjustment: '.json_encode($res->getData())."\n";
    }
} catch (Exception $e) {
    echo '[FAIL] Exception during Adjustment: '.$e->getMessage()."\n";
}

// Check if raw materials are in stock
$c1Stock = WarehouseProductModel::where(['warehouse_id' => $warehouse->id, 'product_id' => $component1->id])->value('quantity');
$c2Stock = WarehouseProductModel::where(['warehouse_id' => $warehouse->id, 'product_id' => $component2->id])->value('quantity');
echo "Raw stocks -> C1: $c1Stock, C2: $c2Stock\n";

// 4. Test Assembly
$asmReq = new Request([
    'product_id' => $product->id,
    'warehouse_id' => $warehouse->id,
    'quantity' => 3, // assemble 3 products (requires 6 of C1 and 3 of C2)
    'type' => 'assemble',
]);

$asmController = app(AssemblyController::class);
try {
    $res = $asmController->assemble($asmReq);
    if ($res->getStatusCode() == 201) {
        echo "[OK] Assembly 'assemble' action successful.\n";
    } else {
        echo '[FAIL] Assembly: '.json_encode($res->getData())."\n";
    }
} catch (Exception $e) {
    echo '[FAIL] Exception during Assembly: '.$e->getMessage()."\n";
}

// Check final stocks
$finalC1 = WarehouseProductModel::where(['warehouse_id' => $warehouse->id, 'product_id' => $component1->id])->value('quantity');
$finalC2 = WarehouseProductModel::where(['warehouse_id' => $warehouse->id, 'product_id' => $component2->id])->value('quantity');
$finalProduct = WarehouseProductModel::where(['warehouse_id' => $warehouse->id, 'product_id' => $product->id])->value('quantity');

echo "Post-Assembly stocks:\n";
echo "C1 (Expected 4, Actual: $finalC1)\n";
echo "C2 (Expected 7, Actual: $finalC2)\n";
echo "Finished (Expected 3, Actual: $finalProduct)\n";

// 5. Test Disassembly (Reverse)
$disasmReq = new Request([
    'product_id' => $product->id,
    'warehouse_id' => $warehouse->id,
    'quantity' => 1, // disassemble 1 product
    'type' => 'disassemble',
]);

try {
    $res = $asmController->assemble($disasmReq);
    if ($res->getStatusCode() == 201) {
        echo "[OK] Assembly 'disassemble' action successful.\n";
    } else {
        echo '[FAIL] Disassemble: '.json_encode($res->getData())."\n";
    }
} catch (Exception $e) {
    echo '[FAIL] Exception during Disassemble: '.$e->getMessage()."\n";
}

$postDisC1 = WarehouseProductModel::where(['warehouse_id' => $warehouse->id, 'product_id' => $component1->id])->value('quantity');
$postDisC2 = WarehouseProductModel::where(['warehouse_id' => $warehouse->id, 'product_id' => $component2->id])->value('quantity');
$postDisProduct = WarehouseProductModel::where(['warehouse_id' => $warehouse->id, 'product_id' => $product->id])->value('quantity');

echo "Post-Disassembly stocks:\n";
echo "C1 (Expected 6, Actual: $postDisC1)\n";
echo "C2 (Expected 8, Actual: $postDisC2)\n";
echo "Finished (Expected 2, Actual: $postDisProduct)\n";

echo "--- Test Completed ---\n";
