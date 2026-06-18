<?php

$files = glob('database/migrations/central/*.php');
foreach ($files as $file) {
    $content = file_get_contents($file);
    // Replace Schema::connection('pgsql')->
    $content = str_replace("Schema::connection('pgsql')->", 'Schema::', $content);

    // Replace enum with string
    $content = preg_replace("/->enum\(([^,]+),\s*\[[^\]]+\]\)/", '->string($1) /* changed from enum for testing */', $content);

    // Replace jsonb with json
    $content = str_replace('->jsonb(', '->json(', $content);

    file_put_contents($file, $content);
    echo 'Patched '.basename($file)."\n";
}
