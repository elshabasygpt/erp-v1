<?php
$file = "tests/TestCase.php";
$content = file_get_contents($file);

$newRefresh = <<<PHP
    protected function refreshTestDatabase()
    {
        // Override all connections to use sqlite
        \$sqliteConfig = [
            'driver'   => 'sqlite',
            'database' => ':memory:',
            'prefix'   => '',
            'foreign_key_constraints' => false,
        ];

        config(['database.connections.pgsql'  => \$sqliteConfig]);
        config(['database.connections.tenant' => \$sqliteConfig]);
        config(['database.default'            => 'sqlite']);

        if (!\Illuminate\Foundation\Testing\RefreshDatabaseState::\$migrated) {

            // Purge cached connections ONLY on first run
            \DB::purge('pgsql');
            \DB::purge('tenant');
            \DB::purge('sqlite');

            // Get fresh sqlite connection
            \$sqlite = \DB::connection('sqlite');

            // Share PDO with all connections
            \DB::connection('pgsql')->setPdo(\$sqlite->getPdo());
            \DB::connection('tenant')->setPdo(\$sqlite->getPdo());

            // Run all migrations on sqlite
            \Artisan::call('migrate:fresh', [
                '--database' => 'sqlite',
                '--force'    => true,
            ]);

            \Artisan::call('migrate', [
                '--path'     => 'database/migrations/central',
                '--database' => 'sqlite',
                '--force'    => true,
            ]);

            \Artisan::call('migrate', [
                '--path'     => 'database/migrations/tenant',
                '--database' => 'sqlite',
                '--force'    => true,
            ]);

            // Create cache tables manually if missing
            if (!\Schema::connection('sqlite')->hasTable('cache')) {
                \Schema::connection('sqlite')->create('cache', function (\$table) {
                    \$table->string('key')->primary();
                    \$table->mediumText('value');
                    \$table->integer('expiration');
                });
            }

            if (!\Schema::connection('sqlite')->hasTable('cache_locks')) {
                \Schema::connection('sqlite')->create('cache_locks', function (\$table) {
                    \$table->string('key')->primary();
                    \$table->string('owner');
                    \$table->integer('expiration');
                });
            }

            \Illuminate\Foundation\Testing\RefreshDatabaseState::\$migrated = true;
            
            foreach (\$this->connectionsToTransact() as \$name) {
                \Illuminate\Foundation\Testing\RefreshDatabaseState::\$inMemoryConnections[\$name] = \Illuminate\Support\Facades\DB::connection(\$name)->getPdo();
            }
        } else {
            // For subsequent tests, just ensure the PDO is shared
            \$sqlite = \DB::connection('sqlite');
            \DB::connection('pgsql')->setPdo(\$sqlite->getPdo());
            \DB::connection('tenant')->setPdo(\$sqlite->getPdo());
        }

        \$this->beginDatabaseTransaction();
    }
PHP;

$content = preg_replace('/protected function refreshTestDatabase\(\)\s*\{.*?\n    \}/s', $newRefresh, $content, 1);
file_put_contents($file, $content);
echo "TestCase.php patched.\n";

