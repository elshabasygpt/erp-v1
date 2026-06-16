<?php
$dir = __DIR__ . '/src/components/sales';

$content = file_get_contents("$dir/hooks/useSalesFilters.ts");

$content = str_replace(
    "const [showChart, setShowChart] = useState(true);",
    "const [showChart, setShowChart] = useState(true);\n    const [showExportMenu, setShowExportMenu] = useState(false);",
    $content
);

$content = str_replace(
    "showChart, setShowChart,",
    "showChart, setShowChart,\n        showExportMenu, setShowExportMenu,",
    $content
);

file_put_contents("$dir/hooks/useSalesFilters.ts", $content);
?>
