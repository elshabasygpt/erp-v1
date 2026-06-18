<?php

$content = file_get_contents('tests/Feature/Inventory/InventoryTest.php');

$content = str_replace(
    "'name' => 'Test Branch', 'name_ar' => 'Test Branch', 'company_id' => Str::uuid()->toString(),",
    "'name' => 'Test Branch', 'name_ar' => 'Test Branch',",
    $content
);

file_put_contents('tests/Feature/Inventory/InventoryTest.php', $content);
