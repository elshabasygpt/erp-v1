import { useState, useEffect, useCallback } from 'react';
import { inventoryApi, purchasesApi, purchaseReturnsApi, crmApi } from '@/lib/api';

export function usePurchasesData() {
    const [loading, setLoading] = useState(true);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [returns, setReturns] = useState<any[]>([]);

    const fetchInvoices = useCallback(async () => {
        try {
            const res = await purchasesApi.getInvoices({ limit: 100 });
            setInvoices(res.data?.data?.data || []);
        } catch (error) {
            console.error(error);
        }
    }, []);

    const fetchReturns = useCallback(async () => {
        try {
            const res = await purchaseReturnsApi.getReturns({ limit: 100 });
            setReturns(res.data?.data?.data || []);
        } catch (error) {
            console.error(error);
        }
    }, []);

    const fetchInitialData = useCallback(async () => {
        setLoading(true);
        try {
            const [supRes, warRes, prodRes] = await Promise.all([
                crmApi.getSuppliers({ limit: 100 }),
                inventoryApi.getWarehouses({ limit: 100 }),
                inventoryApi.getProducts({ limit: 100 })
            ]);
            setSuppliers(supRes.data?.data?.data || []);
            setWarehouses(warRes.data?.data?.data || []);
            setProducts(prodRes.data?.data?.data || []);
            
            await fetchInvoices();
            await fetchReturns();
        } catch (error) {
            console.error('Initial data fetch error:', error);
        } finally {
            setLoading(false);
        }
    }, [fetchInvoices, fetchReturns]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    return {
        loading, suppliers, warehouses, products, invoices, returns,
        fetchInvoices, fetchReturns, fetchInitialData
    };
}