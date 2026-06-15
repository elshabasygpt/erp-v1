<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

\Illuminate\Support\Facades\Config::set('database.connections.sqlite.database', ':memory:');

\Illuminate\Support\Facades\Artisan::call('migrate:fresh', ['--database' => 'sqlite']);
echo \Illuminate\Support\Facades\Artisan::output();

\Illuminate\Support\Facades\Artisan::call('migrate', [
    '--path'     => 'database/migrations/central',
    '--database' => 'sqlite',
    '--force'    => true,
]);
echo \Illuminate\Support\Facades\Artisan::output();

$tables = \Illuminate\Support\Facades\DB::connection('sqlite')->select("SELECT name FROM sqlite_master WHERE type='table'");
print_r($tables);
