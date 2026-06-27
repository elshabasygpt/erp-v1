<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$files = glob(database_path('*tenant*.sqlite'));
foreach ($files as $file) {
    config(['database.connections.tenant.database' => $file]);
    \DB::purge('tenant');
    try {
        \DB::connection('tenant')->statement('ALTER TABLE invoices ADD COLUMN safe_id VARCHAR(36) NULL;');
        echo 'Migrated ' . basename($file) . "\n";
    } catch (\Exception $e) {
        echo 'Error on ' . basename($file) . ': ' . $e->getMessage() . "\n";
    }
}
