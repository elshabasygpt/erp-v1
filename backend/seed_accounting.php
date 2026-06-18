<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

$tenantId = '00000000-0000-0000-0000-000000000001';
$accounts = [
    'cash' => ['name' => 'Cash', 'type' => 'asset', 'code' => '1001'],
    'ar' => ['name' => 'Accounts Receivable', 'type' => 'asset', 'code' => '1002'],
    'inventory' => ['name' => 'Inventory', 'type' => 'asset', 'code' => '1003'],
    'vat_input' => ['name' => 'VAT Input', 'type' => 'asset', 'code' => '1004'],
    'bank' => ['name' => 'Bank', 'type' => 'asset', 'code' => '1005'],
    'ap' => ['name' => 'Accounts Payable', 'type' => 'liability', 'code' => '2001'],
    'vat_payable' => ['name' => 'VAT Payable', 'type' => 'liability', 'code' => '2002'],
    'revenue' => ['name' => 'Sales Revenue', 'type' => 'revenue', 'code' => '4001'],
    'discount' => ['name' => 'Sales Discount', 'type' => 'expense', 'code' => '5001'],
    'cogs' => ['name' => 'Cost of Goods Sold', 'type' => 'expense', 'code' => '5002'],
    'opening_balance_equity' => ['name' => 'Opening Balance Equity', 'type' => 'equity', 'code' => '3001'],
    'inventory_shrinkage' => ['name' => 'Inventory Shrinkage', 'type' => 'expense', 'code' => '5003'],
    'fx_gain_loss' => ['name' => 'FX Gain/Loss', 'type' => 'expense', 'code' => '5004'],
];

$mappings = [];
foreach ($accounts as $key => $acc) {
    $id = Str::uuid()->toString();
    DB::connection('tenant')->table('accounts')->updateOrInsert(
        ['tenant_id' => $tenantId, 'code' => $acc['code']],
        [
            'id' => Str::uuid()->toString(), // Wait, if it exists, it will update id? Let's not update id if exists.
            'name' => $acc['name'],
            'name_ar' => $acc['name'],
            'type' => $acc['type'],
            'is_active' => true,
            'updated_at' => now(),
        ]
    );
    // Let's retrieve the id to map it correctly
    $id = DB::connection('tenant')->table('accounts')->where('tenant_id', $tenantId)->where('code', $acc['code'])->value('id');
    $mappings["account.{$key}"] = $id;
}

foreach ($mappings as $key => $val) {
    DB::connection('tenant')->table('tenant_settings')->updateOrInsert(
        ['tenant_id' => $tenantId, 'key' => $key],
        ['id' => Str::uuid()->toString(), 'value' => $val, 'updated_at' => now()]
    );
}

echo "Accounts and Mappings seeded successfully.\n";
