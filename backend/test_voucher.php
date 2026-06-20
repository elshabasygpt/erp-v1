<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    $req = new \Illuminate\Http\Request();
    $req->merge([
        'type' => 'receipt',
        'amount' => 100,
        'date' => '2026-06-20',
        'customer_id' => '4e93531c-4a42-49b7-9337-e6e2d5a6a282',
        'safe_id' => \App\Infrastructure\Eloquent\Models\SafeModel::first()->id ?? null
    ]);
    $req->headers->set('X-Tenant-ID', 'tenant1');
    $req->setUserResolver(function() {
        return new class { public $id = 'user1'; };
    });
    
    $c = new \App\Presentation\Controllers\API\CRM\VoucherController();
    $res = $c->store($req);
    echo "SUCCESS: " . json_encode($res->getData());
} catch (\Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n" . $e->getTraceAsString();
}
