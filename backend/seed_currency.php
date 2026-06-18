<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$currency = \App\Infrastructure\Eloquent\Models\CurrencyModel::query()->create([
    'id' => \Illuminate\Support\Str::uuid()->toString(),
    'tenant_id' => '00000000-0000-0000-0000-000000000001',
    'name' => 'Saudi Riyal',
    'code' => 'SAR',
    'symbol' => 'SAR',
    'exchange_rate' => 1.0,
    'is_base' => true,
    'is_active' => true,
]);

echo "Created currency: " . $currency->id . "\n";
