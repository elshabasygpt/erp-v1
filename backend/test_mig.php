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
$sqliteConfig = Config::get('database.connections.sqlite');
Config::set('database.connections.pgsql', $sqliteConfig);
Config::set('database.connections.tenant', $sqliteConfig);

DB::purge('sqlite');
DB::purge('pgsql');
DB::purge('tenant');

$sqlite = DB::connection('sqlite');
$pgsql = DB::connection('pgsql');
$tenant = DB::connection('tenant');

$pgsql->setPdo($sqlite->getPdo());
$tenant->setPdo($sqlite->getPdo());

try {
    Artisan::call('migrate:fresh', ['--database' => 'sqlite']);
    echo 'Fresh run: '.Artisan::output()."\n";

    Artisan::call('migrate', [
        '--path' => 'database/migrations/central',
        '--database' => 'sqlite',
        '--force' => true,
    ]);
    echo 'Central run: '.Artisan::output()."\n";

    $tables = DB::connection('pgsql')->select("SELECT name FROM sqlite_master WHERE type='table'");
    print_r($tables);
} catch (Exception $e) {
    echo $e->getMessage()."\n";
}
