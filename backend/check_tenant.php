<?php

$dir = new RecursiveDirectoryIterator('app/Presentation/Controllers/API');
$ite = new RecursiveIteratorIterator($dir);
$files = new RegexIterator($ite, '/^.+\.php$/i', RecursiveRegexIterator::GET_MATCH);
$count = 0;
foreach ($files as $file) {
    if (str_contains($file[0], 'AuthController')) {
        continue;
    }
    $content = file_get_contents($file[0]);
    if (! str_contains($content, 'getTenantId')) {
        echo 'MISSING getTenantId CALL in '.$file[0]."\n";
        $count++;
    }
}
echo "Total Controllers missing getTenantId: $count\n";
