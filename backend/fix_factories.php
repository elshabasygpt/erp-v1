<?php

$models = [
    'PartnerModel', 'PurchaseInvoiceModel', 'SupplierModel', 'WarehouseModel', 'ProductModel',
];
foreach ($models as $model) {
    $path = 'app/Infrastructure/Eloquent/Models/'.$model.'.php';
    if (! file_exists($path)) {
        continue;
    }
    $content = file_get_contents($path);
    if (! str_contains($content, 'HasFactory')) {
        // Insert use Illuminate\Database\Eloquent\Factories\HasFactory;
        $content = preg_replace('/namespace .*;/i', "$0\n\nuse Illuminate\Database\Eloquent\Factories\HasFactory;", $content);
        // Insert use HasFactory; inside class
        $content = preg_replace('/class '.$model.' extends [^{]+{/i', "$0\n    use HasFactory;\n", $content);
        file_put_contents($path, $content);
        echo 'Added HasFactory to '.$model."\n";
    }
}
