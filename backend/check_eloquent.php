<?php
$dir = new RecursiveDirectoryIterator('app/Presentation/Controllers/API');
$ite = new RecursiveIteratorIterator($dir);
$files = new RegexIterator($ite, '/^.+\.php$/i', RecursiveRegexIterator::GET_MATCH);
$count = 0;
foreach($files as $file) {
    if (str_contains($file[0], 'AuthController')) continue;
    $content = file_get_contents($file[0]);
    // Match Model::find($id) or Model::findOrFail($id)
    if (preg_match_all('/([A-Z]\w+)::(?:find|findOrFail)\(/', $content, $matches)) {
        echo 'MISSING TENANT SCOPE on Eloquent find in ' . $file[0] . "\n";
        $count++;
    }
    // Match Model::all()
    if (preg_match_all('/([A-Z]\w+)::all\(\)/', $content, $matches)) {
        echo 'MISSING TENANT SCOPE on Eloquent all in ' . $file[0] . "\n";
        $count++;
    }
    // Match Model::where but missing tenant_id
    // This is harder to regex reliably, but let's see find/all first.
}
echo "Total Eloquent queries without explicit where('tenant_id'): $count\n";
