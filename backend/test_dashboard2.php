<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$user = \App\Infrastructure\Eloquent\Models\UserModel::first();
\Illuminate\Support\Facades\Auth::login($user);

$request = Illuminate\Http\Request::create('/api/sales/advanced-reports/charts?date_from=2026-06-01&date_to=2026-06-17', 'GET');
$request->headers->set('X-Tenant-Id', $user->tenant_id);
$response = app()->handle($request);
echo $response->getContent();
