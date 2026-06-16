<?php
$dir = __DIR__ . '/src/components/sales';

$useSalesActions = <<<EOT
import { useState, useCallback } from 'react';
import { salesApi } from '@/lib/api';

export function useSalesActions(activeTab: string, sellerInfo: any, locale: string) {
    const isRTL = locale === 'ar';
    const [showModal, setShowModal] = useState(false);
    const [showSalesOrderModal, setShowSalesOrderModal] = useState(false);
    const [quotationToConvert, setQuotationToConvert] = useState<any>(null);
    const [showDetail, setShowDetail] = useState<any>(null);
    const [printingInvoice, setPrintingInvoice] = useState<any>(null);
    const [detailedData, setDetailedData] = useState<any>(null);
    const [fetchingDetail, setFetchingDetail] = useState(false);

    const handleViewDetail = useCallback(async (item: any) => {
        setShowDetail(item);
        setFetchingDetail(true);
        try {
            let res;
            if (activeTab === 'invoices') res = await salesApi.getInvoice(item.id);
            else if (activeTab === 'returns') res = await salesApi.getReturn(item.id);
            else if (activeTab === 'quotations') res = await salesApi.getQuotation(item.id);
            else if (activeTab === 'orders') res = await salesApi.getSalesOrder(item.id);
            else if (activeTab === 'shipping') res = await salesApi.getShippingInvoice(item.id);
            setDetailedData(res?.data?.data || res?.data);
        } catch (error) {
            console.error("Failed fetching detail", error);
        }
        setFetchingDetail(false);
    }, [activeTab]);

    const handlePrint = useCallback(async (item: any) => {
        if (activeTab === 'invoices') {
            try {
                const res = await salesApi.getInvoice(item.id);
                const fullInvoice = res?.data?.data || res?.data;
                const printData = {
                    id: fullInvoice.invoice_number,
                    uuid: fullInvoice.id?.toString(),
                    type: (fullInvoice.type === 'tax_invoice' ? 'tax_invoice' : 'simplified') as any,
                    date: fullInvoice.invoice_date,
                    time: new Date(fullInvoice.created_at).toLocaleTimeString('en-GB', { hour12: false }),
                    seller: sellerInfo || {
                        name: 'My Company',
                        vatNumber: '300000000000003',
                        crNumber: '1010000000',
                        address: '',
                        city: '',
                        phone: '',
                    },
                    buyer: fullInvoice.customer ? {
                        name: fullInvoice.customer.name,
                        vatNumber: fullInvoice.customer.tax_number,
                        crNumber: fullInvoice.customer.commercial_register,
                    } : undefined,
                    items: (fullInvoice.items || []).map((i: any) => ({
                        code: i.product?.code || 'N/A',
                        name: isRTL ? (i.product?.name_ar || i.product?.name) : i.product?.name,
                        qty: i.quantity,
                        unit: i.product?.unit || 'pc',
                        price: i.unit_price,
                        vatRate: 0.15,
                    })),
                    paymentType: (fullInvoice.payment_method || 'cash') as any,
                    notes: fullInvoice.notes,
                };
                setPrintingInvoice(printData);
            } catch (error) {
                console.error("Print failed", error);
            }
        } else {
            window.print();
        }
    }, [activeTab, sellerInfo, isRTL]);

    return {
        showModal, setShowModal,
        showSalesOrderModal, setShowSalesOrderModal,
        quotationToConvert, setQuotationToConvert,
        showDetail, setShowDetail,
        printingInvoice, setPrintingInvoice,
        detailedData, setDetailedData,
        fetchingDetail, setFetchingDetail,
        handleViewDetail, handlePrint
    };
}
EOT;
file_put_contents("$dir/hooks/useSalesActions.ts", $useSalesActions);
?>
