import { useState, useCallback } from 'react';
import { purchasesApi, purchaseReturnsApi } from '@/lib/api';

export function usePurchaseForm(invoices: any[], warehouses: any[], fetchInvoices: () => void, fetchReturns: () => void) {
    const [activeTab, setActiveTab] = useState<'purchases' | 'returns'>('purchases');
    
    const [searchInvoice, setSearchInvoice] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);

    const [searchReturn, setSearchReturn] = useState('');
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [selectedReturn, setSelectedReturn] = useState<any>(null);

    const [newOrder, setNewOrder] = useState<any>(null);
    const [newReturn, setNewReturn] = useState<any>(null);

    const initOrderForm = useCallback(() => ({
        id: null,
        supplier_id: '',
        warehouse_id: '',
        payment_type: 'cash',
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date().toISOString().split('T')[0],
        notes: '',
        cost_center_id: '',
        currency_id: '',
        exchange_rate: 1.0,
        items: [{ product_id: '', qty: 1, unit_price: 0, tax_rate: 15 }],
    }), []);

    const initReturnForm = useCallback(() => ({
        id: null,
        supplier_id: '',
        warehouse_id: '',
        purchase_invoice_id: '',
        issue_date: new Date().toISOString().split('T')[0],
        notes: '',
        items: [{ product_id: '', qty: 1, unit_price: 0, tax_rate: 15 }],
    }), []);

    const handleSaveOrder = async (status: string) => {
        try {
            const payload = {
                ...newOrder,
                cost_center_id: newOrder.cost_center_id || undefined,
                currency_id: newOrder.currency_id || undefined,
                exchange_rate: newOrder.exchange_rate,
                status,
                items: newOrder.items.map((i: any) => ({
                    product_id: i.product_id,
                    quantity: Number(i.qty),
                    unit_price: Number(i.unit_price),
                    tax_rate: Number(i.tax_rate)
                }))
            };

            if (newOrder.id) {
                await purchasesApi.updateInvoice(newOrder.id, payload);
            } else {
                await purchasesApi.createInvoice(payload);
            }
            setShowOrderModal(false);
            fetchInvoices();
        } catch (error) {
            console.error('Error saving order', error);
            alert('Failed to save order');
        }
    };

    const handleUpdateOrderStatus = async (id: string, status: string, warehouse_id: string | null = null) => {
        if (status === 'confirmed') {
            const order = invoices.find(i => i.id === id);
            const wId = warehouse_id || order?.items?.[0]?.warehouse_id || warehouses[0]?.id;
            if(!wId) return alert('No warehouse available to receive inventory');
            try {
                await purchasesApi.updateStatus(id, { status, warehouse_id: wId });
                fetchInvoices();
                setSelectedOrder(null);
            } catch(e) {
                alert('Error updating status');
            }
        } else {
            try {
                await purchasesApi.updateStatus(id, { status });
                fetchInvoices();
            } catch(e) {
                alert('Error updating status');
            }
        }
    };

    const handleSaveReturn = async (status: string) => {
        try {
            const payload = {
                ...newReturn,
                status,
                items: newReturn.items.map((i: any) => ({
                    product_id: i.product_id,
                    quantity: Number(i.qty),
                    unit_price: Number(i.unit_price),
                    tax_rate: Number(i.tax_rate)
                }))
            };
            await purchaseReturnsApi.createReturn(payload);
            setShowReturnModal(false);
            fetchReturns();
        } catch (error) {
            console.error(error);
            alert('Failed to process return');
        }
    };

    const handleCompleteReturn = async (id: string, warehouse_id: string) => {
        if(!warehouse_id) return alert('Warehouse is required to complete return');
        try {
            await purchaseReturnsApi.updateReturnStatus(id, { status: 'completed', notes: warehouse_id });
            fetchReturns();
            setSelectedReturn(null);
        } catch (error) {
            alert('Error completing return');
        }
    };

    const openEditOrder = useCallback((order: any) => {
        setNewOrder({
            id: order.id,
            supplier_id: order.supplier_id,
            warehouse_id: order.warehouse_id || warehouses[0]?.id || '',
            payment_type: order.paid_amount > 0 ? 'cash' : 'credit',
            issue_date: order.invoice_date ? order.invoice_date.split('T')[0] : '',
            status: order.status,
            notes: order.notes || '',
            items: order.items?.map((it:any) => ({
                product_id: it.product_id,
                qty: Number(it.quantity),
                unit_price: Number(it.unit_price),
                tax_rate: Number(it.vat_rate)
            })) || []
        });
        setSelectedOrder(null);
        setShowOrderModal(true);
    }, [warehouses]);

    return {
        activeTab, setActiveTab,
        searchInvoice, setSearchInvoice, statusFilter, setStatusFilter, showOrderModal, setShowOrderModal, selectedOrder, setSelectedOrder,
        searchReturn, setSearchReturn, showReturnModal, setShowReturnModal, selectedReturn, setSelectedReturn,
        newOrder, setNewOrder, newReturn, setNewReturn,
        initOrderForm, initReturnForm, openEditOrder,
        handleSaveOrder, handleUpdateOrderStatus, handleSaveReturn, handleCompleteReturn
    };
}