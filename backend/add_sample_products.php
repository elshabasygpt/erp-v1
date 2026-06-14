<?php

use Illuminate\Support\Facades\DB;
use Ramsey\Uuid\Uuid;

// Add Pro POS Demo Products
$products = [
    ['name' => 'Coffee Latte',           'name_ar' => 'قهوة لاتيه بريميوم',      'sku' => 'CFE-001-' . time(), 'barcode' => 'COFFEE01', 'cost_price' => 8,    'sell_price' => 18,   'stock' => 500, 'image_url' => '/images/products/coffee.png', 'is_favorite' => true],
    ['name' => 'Butter Croissant',       'name_ar' => 'كرواسون زبدة فرنسي',     'sku' => 'CRN-001-' . time(), 'barcode' => 'CRSN01',  'cost_price' => 5,    'sell_price' => 12,   'stock' => 80,  'image_url' => '/images/products/croissant.png', 'is_favorite' => true],
];

$warehouse = DB::connection('tenant')->table('warehouses')->where('is_default', true)->first();
$warehouseId = $warehouse ? $warehouse->id : Uuid::uuid4()->toString();

foreach ($products as $p) {
    $pid = Uuid::uuid4()->toString();
    
    // Insert Item
    DB::connection('tenant')->table('products')->insert([
        'id' => $pid, 
        'name' => $p['name'], 
        'name_ar' => $p['name_ar'],
        'sku' => $p['sku'], 
        'barcode' => $p['barcode'],
        'cost_price' => $p['cost_price'], 
        'sell_price' => $p['sell_price'],
        'vat_rate' => 15, 
        'stock_alert_level' => 5,
        'image_url' => $p['image_url'],
        'is_favorite' => true,
        'is_active' => true, 
        'created_at' => now(), 
        'updated_at' => now(),
    ]);

    // Add Stock
    DB::connection('tenant')->table('warehouse_products')->insert([
        'id' => Uuid::uuid4()->toString(),
        'warehouse_id' => $warehouseId, 
        'product_id' => $pid,
        'quantity' => $p['stock'], 
        'average_cost' => $p['cost_price'],
        'created_at' => now(), 
        'updated_at' => now(),
    ]);
}

echo "✅ Sample Pro POS products added successfully!\n";
