<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

\Illuminate\Support\Facades\Config::set('database.connections.sqlite.database', ':memory:');
$sqliteConfig = \Illuminate\Support\Facades\Config::get('database.connections.sqlite');
\Illuminate\Support\Facades\Config::set('database.connections.pgsql', $sqliteConfig);
\Illuminate\Support\Facades\Config::set('database.connections.tenant', $sqliteConfig);

\Illuminate\Support\Facades\DB::purge('sqlite');
\Illuminate\Support\Facades\DB::purge('pgsql');
\Illuminate\Support\Facades\DB::purge('tenant');

$sqlite = \Illuminate\Support\Facades\DB::connection('sqlite');
$pgsql = \Illuminate\Support\Facades\DB::connection('pgsql');
$tenant = \Illuminate\Support\Facades\DB::connection('tenant');

$pgsql->setPdo($sqlite->getPdo());
$tenant->setPdo($sqlite->getPdo());

try {
    \Illuminate\Support\Facades\Artisan::call('migrate:fresh', ['--database' => 'sqlite']);
    echo 'Fresh run: ' . \Illuminate\Support\Facades\Artisan::output() . "\n";
    
    \Illuminate\Support\Facades\Artisan::call('migrate', [
        '--path'     => 'database/migrations/central',
        '--database' => 'sqlite',
        '--force'    => true,
    ]);
    echo 'Central run: ' . \Illuminate\Support\Facades\Artisan::output() . "\n";
    
    $tables = \Illuminate\Support\Facades\DB::connection('pgsql')->select("SELECT name FROM sqlite_master WHERE type='table'");
    print_r($tables);
} catch (\Exception $e) {
    echo $e->getMessage() . "\n";
}
