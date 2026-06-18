<?php

$dir = new RecursiveDirectoryIterator('app/Infrastructure/Eloquent/Repositories');
$ite = new RecursiveIteratorIterator($dir);
$files = new RegexIterator($ite, '/^.+\.php$/i', RecursiveRegexIterator::GET_MATCH);
$count = 0;
foreach ($files as $file) {
    $content = file_get_contents($file[0]);
    if (preg_match_all('/([A-Z]\w+)::(?:find|findOrFail|all)\b/', $content, $matches)) {
        echo 'MISSING TENANT SCOPE in '.$file[0]."\n";
        $count++;
    }
}
echo "Total Repos missing scope: $count\n";
