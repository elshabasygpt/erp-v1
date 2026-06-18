<?php

use Database\Seeders\Tenant\VehicleDataSeeder;
use Illuminate\Contracts\Console\Kernel;

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

require_once __DIR__.'/database/seeders/Tenant/VehicleDataSeeder.php';

$seeder = new VehicleDataSeeder;
$seeder->run();
echo "Vehicles seeded successfully!\n";
