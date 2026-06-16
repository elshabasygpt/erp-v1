<?php
$dir = __DIR__ . '/src/components/sales';
$content = file_get_contents("$dir/SalesModals.tsx");

// Add warehouses to interface
$content = str_replace(
    "activeTab: string;",
    "warehouses: any[];\n    activeTab: string;",
    $content
);

// Fix InvoicePrintTemplate
$content = str_replace(
    "<InvoicePrintTemplate \n                            invoice={printingInvoice}\n                        />",
    "<InvoicePrintTemplate \n                            invoice={printingInvoice}\n                            locale={locale}\n                            onClose={() => setPrintingInvoice(null)}\n                        />",
    $content
);

// Fix QuotationModal
$content = preg_replace(
    '/<QuotationModal[\s\S]*?\/>/',
    '<QuotationModal dict={dict} locale={locale} onClose={() => { setShowModal(false); refetch(); }} />',
    $content
);

// Fix SalesOrderModal
$content = preg_replace(
    '/<SalesOrderModal[\s\S]*?\/>/',
    '<SalesOrderModal dict={dict} locale={locale} onClose={() => { setShowSalesOrderModal(false); setQuotationToConvert(null); refetch(); }} quotation={quotationToConvert} />',
    $content
);

// Fix ShippingModal
$content = preg_replace(
    '/<ShippingModal[\s\S]*?\/>/',
    '<ShippingModal dict={dict} locale={locale} onClose={() => { setShowModal(false); refetch(); }} />',
    $content
);

file_put_contents("$dir/SalesModals.tsx", $content);
?>
