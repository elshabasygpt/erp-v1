<?php
$dirs = [
    __DIR__ . '/app/Presentation/Controllers/API'
];

function patchFile($file) {
    $content = file_get_contents($file);
    $original = $content;
    
    if (strpos($file, 'AuthController.php') !== false || strpos($file, 'PartnerAuthController.php') !== false || strpos($file, 'BaseTenantController.php') !== false) {
        return;
    }

    // Match $variable = Model::create($data);
    // where $data is a variable (e.g. $validated or $data)
    $content = preg_replace_callback(
        '/(\$([a-zA-Z0-9_]+)\s*=\s*[A-Z][a-zA-Z0-9_]*Model::create\(\$([a-zA-Z0-9_]+)\);)/',
        function ($matches) {
            $dataVar = $matches[3]; // e.g. validated
            // If the code right before this doesn't already have tenant_id assignment, add it.
            return "\${$dataVar}['tenant_id'] = \$this->getTenantId(\$request);\n        " . $matches[1];
        },
        $content
    );

    // Also match $variable = Model::create(["key" => "val", ...]) 
    // Actually, if it's an array literal, we can't just inject tenant_id before it into $data, we must inject it inside the array.
    $content = preg_replace_callback(
        '/([A-Z][a-zA-Z0-9_]*Model::create\(\[)/',
        function ($matches) {
            return $matches[1] . "\n            'tenant_id' => \$this->getTenantId(\$request),";
        },
        $content
    );

    if ($content !== $original) {
        file_put_contents($file, $content);
        echo "Patched create(): " . basename($file) . "\n";
    }
}

$iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dirs[0]));
foreach ($iterator as $file) {
    if ($file->isFile() && $file->getExtension() === 'php') {
        patchFile($file->getPathname());
    }
}
echo "Done.\n";
