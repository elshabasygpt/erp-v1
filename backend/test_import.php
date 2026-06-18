<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Presentation\Controllers\API\DataImportExportController;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use App\Infrastructure\Eloquent\Models\ProductModel;

$tenantId = '123e4567-e89b-12d3-a456-426614174000'; // Assume test tenant

echo "Products before import: " . ProductModel::count() . "\n";

$file = new UploadedFile(
    __DIR__.'/test_products.csv',
    'test_products.csv',
    'text/csv',
    null,
    true
);

$request = Request::create('/api/data/import', 'POST', [
    'entity' => 'products'
]);
$request->files->set('file', $file);

// Mock user auth
$user = new \App\Infrastructure\Eloquent\Models\UserModel();
$user->tenant_id = $tenantId;
$request->setUserResolver(function () use ($user) { return $user; });

$controller = new DataImportExportController();
$response = $controller->importData($request);

echo "Response status: " . $response->getStatusCode() . "\n";
echo "Response body: " . $response->getContent() . "\n";

echo "Products after import: " . ProductModel::count() . "\n";
