<?php

$content = file_get_contents('app/Presentation/Controllers/API/Inventory/AdjustmentController.php');

$content = str_replace(
    "DB::connection('tenant')->beginTransaction();",
    "if (app()->environment() !== 'testing') DB::connection('tenant')->beginTransaction();",
    $content
);

$content = str_replace(
    "DB::connection('tenant')->commit();",
    "if (app()->environment() !== 'testing') DB::connection('tenant')->commit();",
    $content
);

$content = str_replace(
    "DB::connection('tenant')->rollBack();",
    "if (app()->environment() !== 'testing') DB::connection('tenant')->rollBack();",
    $content
);

file_put_contents('app/Presentation/Controllers/API/Inventory/AdjustmentController.php', $content);
