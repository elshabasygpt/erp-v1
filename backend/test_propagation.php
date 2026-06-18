<?php

use App\Application\Sales\DTOs\CreateInvoiceDTO;
use App\Application\Sales\UseCases\CreateInvoiceUseCase;
use App\Infrastructure\Eloquent\Models\Accounting\CostCenterModel;
use App\Infrastructure\Eloquent\Models\CurrencyModel;
use App\Infrastructure\Eloquent\Models\CustomerModel;
use App\Infrastructure\Eloquent\Models\InvoiceModel;
use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\WarehouseModel;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$tenantId = Str::uuid()->toString();
DB::setDefaultConnection('tenant');

// Mock data
$customer = CustomerModel::firstOrCreate(['email' => 'test@test.com'], ['id' => Str::uuid(), 'name' => 'Test Customer', 'is_active' => true, 'tenant_id' => $tenantId]);
$warehouse = WarehouseModel::firstOrCreate(['name' => 'Main Warehouse'], ['id' => Str::uuid(), 'tenant_id' => $tenantId]);
$costCenter = CostCenterModel::firstOrCreate(['code' => 'CC-001'], ['id' => Str::uuid(), 'name' => 'Main CC', 'is_active' => true, 'tenant_id' => $tenantId]);
$currency = CurrencyModel::firstOrCreate(['code' => 'USD'], ['id' => Str::uuid(), 'name' => 'US Dollar', 'exchange_rate' => 3.75, 'is_active' => true, 'tenant_id' => $tenantId]);
$product = ProductModel::firstOrCreate(['sku' => 'TEST-123'], ['id' => Str::uuid(), 'name' => 'Test Product', 'type' => 'standard', 'sell_price' => 100, 'vat_rate' => 15, 'tenant_id' => $tenantId]);

$dto = CreateInvoiceDTO::fromRequest([
    'customer_id' => $customer->id,
    'warehouse_id' => $warehouse->id,
    'type' => 'credit',
    'status' => 'draft',
    'items' => [
        [
            'product_id' => $product->id,
            'quantity' => 2,
            'unit_price' => 100,
            'discount_percent' => 0,
            'vat_rate' => 15,
            'base_unit_price' => 100,
            'adjusted_unit_price' => 100,
            'adjustment_amount' => 0,
        ],
    ],
    'cost_center_id' => $costCenter->id,
    'currency_id' => $currency->id,
    'exchange_rate' => 3.75,
]);

$useCase = app(CreateInvoiceUseCase::class);

try {
    $invoice = $useCase->execute($dto, 'user-1');
    echo "SUCCESS: Invoice created.\n";
    echo 'Cost Center ID: '.$invoice->getCostCenterId()."\n";
    echo 'Currency ID: '.$invoice->getCurrencyId()."\n";
    echo 'Exchange Rate: '.$invoice->getExchangeRate()."\n";

    // Verify DB
    $dbInvoice = InvoiceModel::find($invoice->getId());
    echo "\nDB Cost Center: ".$dbInvoice->cost_center_id."\n";
    echo 'DB Currency: '.$dbInvoice->currency_id."\n";
    echo 'DB Exchange Rate: '.$dbInvoice->exchange_rate."\n";

    if ($dbInvoice->cost_center_id === $costCenter->id && $dbInvoice->currency_id === $currency->id) {
        echo "\n[PASS] Propagation Verified End-to-End!\n";
    } else {
        echo "\n[FAIL] Data lost during propagation!\n";
    }

} catch (Exception $e) {
    echo 'Error: '.$e->getMessage()."\n";
}
