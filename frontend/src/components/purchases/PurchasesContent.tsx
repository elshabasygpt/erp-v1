'use client';

import React from 'react';
import { usePurchasesData } from './hooks/usePurchasesData';
import { usePurchaseForm } from './hooks/usePurchaseForm';
import PurchasesTabs from './PurchasesTabs';
import PurchasesStats from './PurchasesStats';
import PurchasesTable from './PurchasesTable';
import PurchaseReturnsTable from './PurchaseReturnsTable';
import PurchasesModals from './PurchasesModals';

interface PurchasesContentProps {
    dict: any;
    locale: string;
}

const isRTL_check = (locale: string) => locale === 'ar';

export default function PurchasesContent({ dict, locale }: PurchasesContentProps) {
    const isRTL = isRTL_check(locale);
    const tc = dict.common || {};

    const {
        loading, suppliers, warehouses, products, invoices, returns,
        fetchInvoices, fetchReturns
    } = usePurchasesData();

    const {
        activeTab, setActiveTab,
        searchInvoice, setSearchInvoice, statusFilter, setStatusFilter, showOrderModal, setShowOrderModal, selectedOrder, setSelectedOrder,
        searchReturn, setSearchReturn, showReturnModal, setShowReturnModal, selectedReturn, setSelectedReturn,
        newOrder, setNewOrder, newReturn, setNewReturn,
        initOrderForm, initReturnForm, openEditOrder,
        handleSaveOrder, handleUpdateOrderStatus, handleSaveReturn, handleCompleteReturn
    } = usePurchaseForm(invoices, warehouses, fetchInvoices, fetchReturns);

    const formatCurrency = (amount: number) => `${Number(amount || 0).toLocaleString()} ر.س`;

    const statusConfig: any = {
        confirmed: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'مؤكد/مستلم', labelEn: 'Confirmed' },
        draft: { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', label: 'مسودة', labelEn: 'Draft' },
        cancelled: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: 'ملغي', labelEn: 'Cancelled' },
        completed: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'مكتمل', labelEn: 'Completed' },
    };

    const getStatusLabel = (st: string) => {
        const c = statusConfig[st] || { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', label: st, labelEn: st };
        return isRTL ? c.label : c.labelEn;
    };

    // Derived states
    const filteredInvoices = invoices.filter(i => {
        const matchStr = searchInvoice.toLowerCase();
        const mat = i.invoice_number?.toLowerCase().includes(matchStr) || i.supplier?.name?.toLowerCase().includes(matchStr);
        const stat = statusFilter === 'all' || i.status === statusFilter;
        return mat && stat;
    });

    const filteredReturns = returns.filter(r => {
        const matchStr = searchReturn.toLowerCase();
        return r.number?.toLowerCase().includes(matchStr) || r.supplier?.name?.toLowerCase().includes(matchStr);
    });

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
                <div className="text-surface-500 dark:text-surface-400 font-medium">{isRTL ? 'جاري التحميل...' : 'Loading...'}</div>
            </div>
        );
    }

    const totalPurchasesValue = invoices.reduce((acc, inv) => acc + Number(inv.total || 0), 0);
    const pendingInvoices = invoices.filter(inv => inv.status === 'draft' || inv.status === 'pending').length;
    const totalReturnsValue = returns.reduce((acc, ret) => acc + Number(ret.total_amount || 0), 0);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-surface-900 dark:text-white mb-1">{isRTL ? 'إدارة المشتريات' : 'Purchases Management'}</h1>
                    <p className="text-sm text-surface-500">{isRTL ? 'إدارة فواتير الشراء، المرتجعات ومتابعة حالة الطلبات' : 'Manage purchase invoices, returns and track order status'}</p>
                </div>
                <div className="flex gap-3">
                    {activeTab === 'purchases' ? (
                        <button onClick={() => { setNewOrder(initOrderForm()); setShowOrderModal(true); }} className="btn-primary flex items-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
                            <span className="text-lg">➕</span> {isRTL ? 'فاتورة شراء جديدة' : 'New Invoice'}
                        </button>
                    ) : (
                        <button onClick={() => { setNewReturn(initReturnForm()); setShowReturnModal(true); }} className="btn-primary flex items-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
                            <span className="text-lg">➕</span> {isRTL ? 'تسجيل مرتجع' : 'New Return'}
                        </button>
                    )}
                </div>
            </div>

            <PurchasesStats 
                isRTL={isRTL} totalPurchasesValue={totalPurchasesValue} 
                pendingInvoices={pendingInvoices} totalReturnsValue={totalReturnsValue} 
                suppliersCount={suppliers.length} 
            />

            <PurchasesTabs isRTL={isRTL} activeTab={activeTab} setActiveTab={setActiveTab} />

            {activeTab === 'purchases' && (
                <PurchasesTable 
                    isRTL={isRTL} tc={tc} filteredInvoices={filteredInvoices} 
                    searchInvoice={searchInvoice} setSearchInvoice={setSearchInvoice} 
                    statusFilter={statusFilter} setStatusFilter={setStatusFilter} 
                    setSelectedOrder={setSelectedOrder} statusConfig={statusConfig} 
                    getStatusLabel={getStatusLabel} formatCurrency={formatCurrency} 
                />
            )}

            {activeTab === 'returns' && (
                <PurchaseReturnsTable 
                    isRTL={isRTL} tc={tc} filteredReturns={filteredReturns} 
                    searchReturn={searchReturn} setSearchReturn={setSearchReturn} 
                    setSelectedReturn={setSelectedReturn} statusConfig={statusConfig} 
                    getStatusLabel={getStatusLabel} formatCurrency={formatCurrency} 
                />
            )}

            <PurchasesModals 
                isRTL={isRTL} suppliers={suppliers} warehouses={warehouses} products={products} invoices={invoices}
                showOrderModal={showOrderModal} setShowOrderModal={setShowOrderModal} selectedOrder={selectedOrder} setSelectedOrder={setSelectedOrder}
                newOrder={newOrder} setNewOrder={setNewOrder} handleSaveOrder={handleSaveOrder} openEditOrder={openEditOrder} handleUpdateOrderStatus={handleUpdateOrderStatus}
                showReturnModal={showReturnModal} setShowReturnModal={setShowReturnModal} selectedReturn={selectedReturn} setSelectedReturn={setSelectedReturn}
                newReturn={newReturn} setNewReturn={setNewReturn} handleSaveReturn={handleSaveReturn} handleCompleteReturn={handleCompleteReturn}
                statusConfig={statusConfig} getStatusLabel={getStatusLabel} formatCurrency={formatCurrency}
            />
        </div>
    );
}