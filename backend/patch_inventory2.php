<?php
$content = file_get_contents('tests/Feature/Inventory/InventoryTest.php');

$content = str_replace(
    "'price'         => 100.00,",
    "'selling_price' => 100.00,",
    $content
);

$content = str_replace(
    "'cost'          => 60.00,",
    "'purchase_price'=> 60.00,",
    $content
);

$content = str_replace(
    "'price' => 150.00,",
    "'selling_price' => 150.00,",
    $content
);

// We should also replace the assertStatus(200) with a dump if it fails for all to find the rest
$content = preg_replace('/\$response->assertStatus\((200|201|204)\);/', "if (\$response->status() !== $1) { dump(\$response->json()); }\n        \$response->assertStatus($1);", $content);

file_put_contents('tests/Feature/Inventory/InventoryTest.php', $content);
