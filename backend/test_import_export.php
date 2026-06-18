<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$user = \App\Infrastructure\Eloquent\Models\UserModel::first();
\Illuminate\Support\Facades\Auth::login($user);

// Test Export
echo "Testing Export...\n";
$request = Illuminate\Http\Request::create('/api/data/export?entity=products', 'GET');
$request->headers->set('X-Tenant-Id', $user->tenant_id);
$request->headers->set('Accept', 'application/json');
$response = app()->handle($request);
if ($response->getStatusCode() !== 200) {
    $data = json_decode($response->getContent(), true);
    echo "Export Error: " . ($data['message'] ?? 'Unknown error') . " in " . ($data['file'] ?? '') . ":" . ($data['line'] ?? '') . "\n";
} else {
    echo "Export SUCCESS\n";
}

// Test Import
echo "\nTesting Import...\n";
$csvContent = "name,sku,barcode,description,price,cost,type\nTest Product,TEST-SKU-1,123456789,Test Desc,100,50,standard\n";
$tmpFile = sys_get_temp_dir() . '/test_import_' . time() . '.csv';
file_put_contents($tmpFile, $csvContent);

$file = new \Illuminate\Http\UploadedFile($tmpFile, 'test_import.csv', 'text/csv', null, true);
$request = Illuminate\Http\Request::create('/api/data/import', 'POST', ['entity' => 'products']);
$request->headers->set('X-Tenant-Id', $user->tenant_id);
$request->headers->set('Accept', 'application/json');
$request->files->set('file', $file);

$response = app()->handle($request);
if ($response->getStatusCode() !== 200) {
    $data = json_decode($response->getContent(), true);
    echo "Import Error: " . ($data['message'] ?? $response->getContent()) . " in " . ($data['file'] ?? '') . ":" . ($data['line'] ?? '') . "\n";
} else {
    echo "Import SUCCESS\n";
}
