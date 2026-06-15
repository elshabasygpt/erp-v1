<?php
$content = file_get_contents("tests/Feature/Inventory/InventoryTest.php");
$content = preg_replace('/\$response->assertStatus\((200|201)\);/', "if (\$response->status() !== $1) { dump(\$response->json()); }\n        \$response->assertStatus($1);", $content);
file_put_contents("tests/Feature/Inventory/InventoryTest.php", $content);
