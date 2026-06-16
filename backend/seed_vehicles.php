<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

require_once __DIR__.'/database/seeders/Tenant/VehicleDataSeeder.php';

$seeder = new \Database\Seeders\Tenant\VehicleDataSeeder();
$seeder->run();
echo "Vehicles seeded successfully!\n";
