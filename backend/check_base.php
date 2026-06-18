<?php

$dir = new RecursiveDirectoryIterator('app/Presentation/Controllers/API');
$ite = new RecursiveIteratorIterator($dir);
$files = new RegexIterator($ite, '/^.+\.php$/i', RecursiveRegexIterator::GET_MATCH);
$count = 0;
foreach ($files as $file) {
    $content = file_get_contents($file[0]);
    if (preg_match('/class\s+\w+\s+extends\s+BaseController/', $content)) {
        echo 'STILL BaseController: '.$file[0]."\n";
        $count++;
    }
}
echo "Total extending BaseController: $count\n";
