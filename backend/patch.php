<?php
$dirs = [
    __DIR__ . '/app/Presentation/Controllers/API'
];

function patchFile($file) {
    $content = file_get_contents($file);
    $original = $content;
    
    // Skip controllers we shouldn't modify
    if (strpos($file, 'AuthController.php') !== false || strpos($file, 'PartnerAuthController.php') !== false || strpos($file, 'BaseTenantController.php') !== false) {
        return;
    }

    // 1. Add Request import if missing
    if (strpos($content, 'use Illuminate\Http\Request;') === false && strpos($content, '(Request ') !== false) {
        $content = preg_replace('/namespace (.*?);/', "namespace $1;\n\nuse Illuminate\Http\Request;", $content);
    }

    // 2. Add tenant_id to index queries
    // Usually $query = Model::...
    // Pattern: = Model::(select|with|where|whereBetween|whereNotNull)\(
    $content = preg_replace('/=\s+([A-Z][a-zA-Z0-9_]*Model)::(select|with|where|whereBetween|whereNotNull)\(/', "= $1::where('tenant_id', \$this->getTenantId(\$request))->$2(", $content);
    
    // 3. For show/update/destroy etc which might have `Model::find($id)` or `Model::with(...)->find($id)`
    $content = preg_replace('/([A-Z][a-zA-Z0-9_]*Model)::find\(/', "$1::where('tenant_id', \$this->getTenantId(\$request))->find(", $content);
    $content = preg_replace('/([A-Z][a-zA-Z0-9_]*Model)::findOrFail\(/', "$1::where('tenant_id', \$this->getTenantId(\$request))->findOrFail(", $content);
    
    // Also patch public function show(string $id) to public function show(Request $request, string $id)
    $content = preg_replace('/public function (show|destroy|fulfill|cancel)\(string \$id\)/', "public function $1(Request \$request, string \$id)", $content);
    // if there are methods like public function updateStatus(Request $request, string $id), we already have $request.

    // 4. Inject $validated['tenant_id'] = $this->getTenantId($request); in store/update before DTO or Create/Update
    // Usually `$dto = ...::fromRequest($validated);` or `$model = Model::create($validated);`
    $content = preg_replace('/\$dto = (Create|Update)[A-Za-z]+DTO::fromRequest\(/', "\$validated['tenant_id'] = \$this->getTenantId(\$request);\n            \$dto = $1", $content);
    $content = preg_replace('/\$validated\s*=\s*\$request->validate\(\[.*?\]\);\s*(\$[a-zA-Z_]+ = [A-Z][a-zA-Z0-9_]*Model::create\()/s', "\$validated['tenant_id'] = \$this->getTenantId(\$request);\n        $1", $content);

    // Write back if changed
    if ($content !== $original) {
        file_put_contents($file, $content);
        echo "Patched: " . basename($file) . "\n";
    }
}

$iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dirs[0]));
foreach ($iterator as $file) {
    if ($file->isFile() && $file->getExtension() === 'php') {
        patchFile($file->getPathname());
    }
}
echo "Done.\n";
