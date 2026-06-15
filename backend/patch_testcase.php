<?php
$content = file_get_contents('tests/TestCase.php');

$search = "            // For subsequent tests, just ensure the PDO is shared
            \$sqlite = \\DB::connection('sqlite');
            \\DB::connection('pgsql')->setPdo(\$sqlite->getPdo());
            \\DB::connection('tenant')->setPdo(\$sqlite->getPdo());";

$replace = "            // For subsequent tests, just ensure the PDO is shared
            \$sqlite = \\DB::connection('sqlite');

            // Bump transaction levels so any further beginTransaction() uses savepoints
            \\DB::connection('pgsql')->beginTransaction();
            \\DB::connection('tenant')->beginTransaction();

            \\DB::connection('pgsql')->setPdo(\$sqlite->getPdo());
            \\DB::connection('tenant')->setPdo(\$sqlite->getPdo());";

$content = str_replace($search, $replace, $content);

$search2 = "            // Get fresh sqlite connection
            \$sqlite = \\DB::connection('sqlite');

            // Share PDO with all connections
            \\DB::connection('pgsql')->setPdo(\$sqlite->getPdo());
            \\DB::connection('tenant')->setPdo(\$sqlite->getPdo());";

$replace2 = "            // Get fresh sqlite connection
            \$sqlite = \\DB::connection('sqlite');

            // Bump transaction levels so any further beginTransaction() uses savepoints
            \\DB::connection('pgsql')->beginTransaction();
            \\DB::connection('tenant')->beginTransaction();

            // Share PDO with all connections
            \\DB::connection('pgsql')->setPdo(\$sqlite->getPdo());
            \\DB::connection('tenant')->setPdo(\$sqlite->getPdo());";

$content = str_replace($search2, $replace2, $content);

file_put_contents('tests/TestCase.php', $content);
