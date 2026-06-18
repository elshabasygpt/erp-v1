<?php

use Illuminate\Contracts\Console\Kernel;

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();
$tables = DB::connection('sqlite')->select("SELECT name FROM sqlite_master WHERE type='table'");
foreach ($tables as $t) {
    echo $t->name."\n";
}
