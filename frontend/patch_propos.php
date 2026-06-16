<?php
$dir = __DIR__ . '/src/components/pos';
$content = file_get_contents("$dir/ProPosScreen.tsx");

$content = str_replace(
    "import { PosProductGrid } from './PosProductGrid';",
    "import PosProductGrid from './PosProductGrid';",
    $content
);

file_put_contents("$dir/ProPosScreen.tsx", $content);
?>
