<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$v = validator([
    'model_id' => '123e4567-e89b-12d3-a456-426614174000',
    'year_from' => '2015',
    'year_to' => '',
    'engine_size' => '2.4'
], [
    'model_id' => 'required|uuid',
    'year_from' => 'required|integer|min:1900|max:2030',
    'year_to' => 'nullable|integer|gte:year_from',
    'engine_size' => 'nullable|string|max:50'
]);

echo json_encode(['fails' => $v->fails(), 'errors' => $v->errors()]);
