<?php

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

Config::set('database.connections.sqlite.database', ':memory:');

Artisan::call('migrate:fresh', ['--database' => 'sqlite']);
echo Artisan::output();

Artisan::call('migrate', [
    '--path' => 'database/migrations/central',
    '--database' => 'sqlite',
    '--force' => true,
]);
echo Artisan::output();

$tables = DB::connection('sqlite')->select("SELECT name FROM sqlite_master WHERE type='table'");
print_r($tables);
