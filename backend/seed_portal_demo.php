<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Infrastructure\Eloquent\Models\PartnerModel;
use App\Infrastructure\Eloquent\Models\InvoiceModel;
use App\Infrastructure\Eloquent\Models\InvoiceItemModel;
use App\Infrastructure\Eloquent\Models\ProductModel;
use App\Infrastructure\Eloquent\Models\PartnerProfitShareModel;
use App\Infrastructure\Eloquent\Models\PartnerWithdrawalModel;
use Carbon\Carbon;
use Illuminate\Support\Str;

function seedDemo() {
    $partnerId = PartnerModel::where('email', 'test@partner.com')->value('id');
    if (!$partnerId) { echo "Partner not found!"; return; }

    // 1. Create a few Products
    $products = [
        ['name' => 'iPhone 15 Pro', 'name_ar' => 'ايفون 15 برو', 'cost_price' => 3500, 'sell_price' => 4500, 'sku' => 'IP15P-'.rand(100,999), 'barcode' => '11'.rand(1000,9999), 'stock_quantity' => 100],
        ['name' => 'MacBook Air M2', 'name_ar' => 'ماك بوك اير', 'cost_price' => 4000, 'sell_price' => 5200, 'sku' => 'MBA-'.rand(100,999), 'barcode' => '22'.rand(1000,9999), 'stock_quantity' => 50],
        ['name' => 'AirPods Pro', 'name_ar' => 'ايربودز برو', 'cost_price' => 700, 'sell_price' => 950, 'sku' => 'AP-'.rand(100,999), 'barcode' => '33'.rand(1000,9999), 'stock_quantity' => 200],
    ];

    $productIds = [];
    foreach ($products as $pData) {
        $product = ProductModel::create(array_merge($pData, ['id' => Str::uuid()->toString(), 'type' => 'physical']));
        $productIds[] = $product->id;
    }

    // 2. Clear old demo data purely for clean run
    InvoiceItemModel::truncate();
    InvoiceModel::truncate();
    PartnerProfitShareModel::truncate();
    PartnerWithdrawalModel::truncate();

    // 3. Create Invoices spanning last 6 months to populate the chart
    $dates = [];
    
    // Add multiple for today and yesterday
    for ($i = 0; $i < 4; $i++) $dates[] = Carbon::now();
    for ($i = 0; $i < 3; $i++) $dates[] = Carbon::now()->subDay();
    
    // Add some for previous 6 months
    for ($month = 0; $month <= 6; $month++) {
        for ($i = 0; $i < ($month === 0 ? 5 : rand(10, 15)); $i++) {
            $dates[] = Carbon::now()->subMonths($month)->subDays(rand(1, 28));
        }
    }

    foreach ($dates as $date) {
        $invId = Str::uuid()->toString();
        
        $totalItems = rand(1, 3);
        $totalAmt = 0;
        $itemsData = [];

        for ($k = 0; $k < $totalItems; $k++) {
            $prodIndex = rand(0, 2);
            $qty = rand(1, 4);
            $unitPrice = $products[$prodIndex]['sell_price'];
            $lineTotal = $qty * $unitPrice;
            $totalAmt += $lineTotal;

            $itemsData[] = [
                'id' => Str::uuid()->toString(),
                'product_id' => $productIds[$prodIndex],
                'quantity' => $qty,
                'unit_price' => $unitPrice,
                'total' => $lineTotal,
            ];
        }

        $invoice = InvoiceModel::create([
            'invoice_number' => 'INV-' . strtoupper(Str::random(6)),
            'invoice_date' => $date->format('Y-m-d H:i:s'),
            'type' => 'cash',
            'status' => 'confirmed',
            'subtotal' => $totalAmt,
            'total' => $totalAmt
        ]);

        foreach ($itemsData as $item) {
            $item['invoice_id'] = $invoice->id;
            InvoiceItemModel::create($item);
        }
    }

    $distId = Str::uuid()->toString();
    \App\Infrastructure\Eloquent\Models\ProfitDistributionModel::create([
        'id' => $distId,
        'period_start' => Carbon::now()->subMonths(3)->startOfMonth(),
        'period_end' => Carbon::now()->endOfMonth(),
        'total_revenue' => 100000,
        'total_expenses' => 40000,
        'net_profit' => 60000,
        'status' => 'approved',
    ]);

    // 4. Partner statement data (Profits and Withdrawals)
    PartnerProfitShareModel::create([
        'id' => Str::uuid()->toString(),
        'distribution_id' => $distId, 
        'partner_id' => $partnerId,
        'share_percentage' => 25,
        'amount' => 15000,
        'is_paid' => true,
        'created_at' => Carbon::now()->subMonths(2)
    ]);
    
    PartnerProfitShareModel::create([
        'id' => Str::uuid()->toString(),
        'distribution_id' => $distId, 
        'partner_id' => $partnerId,
        'share_percentage' => 25,
        'amount' => 12500,
        'is_paid' => true,
        'created_at' => Carbon::now()->subMonths(1)
    ]);

    PartnerWithdrawalModel::create([
        'id' => Str::uuid()->toString(),
        'partner_id' => $partnerId,
        'amount' => 5000,
        'notes' => 'سحب أرباح دوري للحساب البنكي',
        'created_at' => Carbon::now()->subDays(15)
    ]);

    // Recalculate totals for the partner
    $partner = PartnerModel::find($partnerId);
    $partner->update([
        'total_pending' => 22500,
        'total_withdrawn' => 5000,
    ]);

    echo "Demo data populated successfully! Check the dashboard.\n";
}

try { seedDemo(); } catch (Exception $e) { echo $e->getMessage(); }
