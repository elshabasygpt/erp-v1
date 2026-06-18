<?php

$content = file_get_contents('tests/Feature/Inventory/InventoryTest.php');

$content = str_replace(
    "\$this->actingAsAuthenticatedUser();\n\n        \$response = \$this->getJson('/api/inventory/products/barcode/1234567890');",
    "\$this->actingAsAuthenticatedUser();\n\n        \\App\\Infrastructure\\Eloquent\\Models\\ProductModel::factory()->create(['barcode' => '1234567890']);\n\n        \$response = \$this->getJson('/api/inventory/products/barcode/1234567890');",
    $content
);

$content = preg_replace(
    "/\\\$response = \\\$this->postJson\('\/api\/inventory\/warehouses', \[\n\s+'name'     => 'مستودع رئيسي',\n\s+'location' => 'الرياض',\n\s+\]\);/",
    "\$branch = \\App\\Infrastructure\\Eloquent\\Models\\BranchModel::factory()->create();\n\n        \$response = \$this->postJson('/api/inventory/warehouses', [\n            'name'     => 'مستودع رئيسي',\n            'location' => 'الرياض',\n            'branch_id'=> \$branch->id,\n        ]);",
    $content
);

$content = str_replace(
    "'type'         => 'addition',",
    "'actual_quantity'=> 60,",
    $content
);

$content = preg_replace(
    "/\\\$response = \\\$this->postJson\('\/api\/inventory\/adjustments', \[\n\s+'warehouse_id' => \\\$warehouse->id,\n\s+'notes'\s+=> 'جرد دوري',/",
    "\$response = \$this->postJson('/api/inventory/adjustments', [\n            'warehouse_id' => \$warehouse->id,\n            'notes'        => 'جرد دوري',\n            'type'         => 'physical_count',\n            'date'         => now()->toDateString(),",
    $content
);

file_put_contents('tests/Feature/Inventory/InventoryTest.php', $content);
