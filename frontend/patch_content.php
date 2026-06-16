<?php
$dir = __DIR__ . '/src/components/sales';
$content = file_get_contents("$dir/SalesContent.tsx");

$content = str_replace(
    "setPrintingInvoice={actions.setPrintingInvoice} warehouses={warehouses} refetch={refetch}",
    "setPrintingInvoice={actions.setPrintingInvoice} quotationToConvert={actions.quotationToConvert} setQuotationToConvert={actions.setQuotationToConvert} warehouses={warehouses} refetch={refetch}",
    $content
);

file_put_contents("$dir/SalesContent.tsx", $content);
?>
