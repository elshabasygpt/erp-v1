<?php
try {
    $pdo = new PDO('pgsql:host=127.0.0.1;port=5432;dbname=saas_accounting_central', 'postgres', '');
    echo "Connected OK!\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
