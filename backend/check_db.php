<?php
$dir = new RecursiveDirectoryIterator('app');
$ite = new RecursiveIteratorIterator($dir);
$files = new RegexIterator($ite, '/^.+\.php$/i', RecursiveRegexIterator::GET_MATCH);
$missing = [];
foreach($files as $file) {
    $content = file_get_contents($file[0]);
    if (preg_match_all('/DB::(:?connection\([^\)]+\)->)?table\(([^)]+)\)/', $content, $matches, PREG_OFFSET_CAPTURE)) {
        foreach($matches[0] as $i => $matchStr) {
            $offset = $matches[0][$i][1];
            $snippet = substr($content, $offset, 150);
            if (!str_contains($snippet, 'tenant_id') && !str_contains($snippet, 'tenantId')) {
                $missing[] = $file[0] . ' : ' . $matchStr[0];
            }
        }
    }
}
echo implode("\n", $missing);
