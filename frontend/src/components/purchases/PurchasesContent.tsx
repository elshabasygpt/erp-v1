'use client';

import { useState, useEffect } from 'react';
import { inventoryApi, purchasesApi, purchaseReturnsApi, crmApi } from '@/lib/api';

interface PurchasesContentProps {
    dict: any;
    locale: string;
}

const isRTL_check = (locale: string) => locale === 'ar';

export default function PurchasesContent({ dict, locale }: PurchasesContentProps) {
    const isRTL = isRTL_check(locale);
    const t = dict.purchases || {};
    const tc = dict.common || {};

    const [activeTab, setActiveTab] = useState<'purchases' | 'returns'>('purchases');
    
    // Global data
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Purchases State
    const [invoices, setInvoices] = useState<any[]>([]);
    const [searchInvoice, setSearchInvoice] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);

    // Returns State
    const [returns, setReturns] = useState<any[]>([]);
    const [searchReturn, setSearchReturn] = useState('');
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [selectedReturn, setSelectedReturn] = useState<any>(null);

    // Forms
    const [newOrder, setNewOrder] = useState<any>(null);
    const [newReturn, setNewReturn] = useState<any>(null);

    const initOrderForm = () => ({
        id: null,
        supplier_id: '',
        warehouse_id: '',
        payment_type: 'cash',
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date().toISOString().split('T')[0],
        notes: '',
        items: [{ product_id: '', qty: 1, unit_price: 0, tax_rate: 15 }],
    });

    const initReturnForm = () => ({
        id: null,
        supplier_id: '',
        warehouse_id: '',
        purchase_invoice_id: '',
        issue_date: new Date().toISOString().split('T')[0],
        notes: '',
        items: [{ product_id: '', qty: 1, unit_price: 0, tax_rate: 15 }],
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
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
    };

    const fetchInvoices = async () => {
        try {
            const res = await purchasesApi.getInvoices({ limit: 100 });
            setInvoices(res.data?.data?.data || []);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchReturns = async () => {
        try {
            const res = await purchaseReturnsApi.getReturns({ limit: 100 });
            setReturns(res.data?.data?.data || []);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSaveOrder = async (status: string) => {
        try {
            const payload = {
                ...newOrder,
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
            await purchaseReturnsApi.updateStatus(id, { status: 'completed', warehouse_id });
            fetchReturns();
            setSelectedReturn(null);
        } catch (error) {
            alert('Error completing return');
        }
    };

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

    const openEditOrder = (order: any) => {
        // format to form
        setNewOrder({
            id: order.id,
            supplier_id: order.supplier_id,
            warehouse_id: order.warehouse_id || warehouses[0]?.id || '', // we need warehouse to edit
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
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
                <div className="text-surface-500 dark:text-surface-400 font-medium">{isRTL ? 'جاري التحميل...' : 'Loading...'}</div>
            </div>
        );
    }

    // Stats calculations
    const totalPurchasesValue = invoices.reduce((acc, inv) => acc + Number(inv.total || 0), 0);
    const pendingInvoices = invoices.filter(inv => inv.status === 'draft' || inv.status === 'pending').length;
    const totalReturnsValue = returns.reduce((acc, ret) => acc + Number(ret.total_amount || 0), 0);

    const stats = [
        { label: isRTL ? 'إجمالي المشتريات' : 'Total Purchases', value: formatCurrency(totalPurchasesValue), icon: '🛒', gradient: 'from-blue-500/20 to-blue-600/5', accent: 'text-blue-500' },
        { label: isRTL ? 'بانتظار الاستلام' : 'Pending Invoices', value: pendingInvoices.toString(), icon: '⏳', gradient: 'from-amber-500/20 to-amber-600/5', accent: 'text-amber-500' },
        { label: isRTL ? 'إجمالي المرتجعات' : 'Total Returns', value: formatCurrency(totalReturnsValue), icon: '↩️', gradient: 'from-rose-500/20 to-rose-600/5', accent: 'text-rose-500' },
        { label: isRTL ? 'عدد الموردين' : 'Total Suppliers', value: suppliers.length.toString(), icon: '🏢', gradient: 'from-emerald-500/20 to-emerald-600/5', accent: 'text-emerald-500' },
    ];

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

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((s, i) => (
                    <div key={i} className="stat-card relative overflow-hidden bg-white dark:bg-surface-900 rounded-2xl p-5 border border-surface-200 dark:border-surface-800 shadow-sm transition-all hover:shadow-md">
                        <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient} opacity-40 transition-opacity duration-300 hover:opacity-70`} />
                        <div className="relative flex items-start justify-between">
                            <div>
                                <p className="text-xs font-semibold mb-1 uppercase tracking-wider text-surface-500">{s.label}</p>
                                <p className={`text-2xl font-black ${s.accent}`}>{s.value}</p>
                            </div>
                            <span className="text-3xl opacity-90 drop-shadow-sm">{s.icon}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-surface-100 dark:bg-surface-800/50 rounded-xl w-fit">
                <button 
                    className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'purchases' ? 'bg-white dark:bg-surface-700 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'}`}
                    onClick={() => setActiveTab('purchases')}
                >
                    {isRTL ? 'فواتير المشتريات' : 'Purchase Invoices'}
                </button>
                <button 
                    className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'returns' ? 'bg-white dark:bg-surface-700 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'}`}
                    onClick={() => setActiveTab('returns')}
                >
                    {isRTL ? 'مرتجعات المشتريات' : 'Purchase Returns'}
                </button>
            </div>

            {activeTab === 'purchases' && (
                <>
                    <div className="flex flex-wrap gap-3 mb-4">
                        <div className="relative flex-1 min-w-[250px] max-w-sm">
                            <span className="absolute inset-y-0 start-0 flex items-center ps-3 text-surface-400">🔍</span>
                            <input
                                type="text"
                                placeholder={isRTL ? "بحث برقم الفاتورة أو المورد..." : "Search by invoice or supplier..."}
                                className="input-field ps-10 w-full"
                                value={searchInvoice}
                                onChange={e => setSearchInvoice(e.target.value)}
                            />
                        </div>
                        <select className="select-field w-auto min-w-[150px]" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                            <option value="all">{isRTL ? 'الكل' : 'All'}</option>
                            <option value="draft">{isRTL ? 'مسودة' : 'Draft'}</option>
                            <option value="confirmed">{isRTL ? 'مؤكد/مستلم' : 'Confirmed'}</option>
                        </select>
                    </div>
                    
                    {filteredInvoices.length === 0 ? (
                        <div className="glass-card flex flex-col items-center justify-center py-16 px-4 text-center">
                            <span className="text-5xl mb-4 opacity-50">🛒</span>
                            <h3 className="text-lg font-bold text-surface-700 dark:text-surface-300 mb-1">{isRTL ? 'لا توجد فواتير' : 'No invoices found'}</h3>
                            <p className="text-surface-500 max-w-sm">{isRTL ? 'لم يتم العثور على أي فواتير مشتريات تطابق بحثك. يمكنك إضافة فاتورة جديدة.' : 'No purchase invoices matched your criteria. You can create a new invoice.'}</p>
                        </div>
                    ) : (
                        <div className="glass-card overflow-x-auto">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>{isRTL ? 'الرقم' : 'Number'}</th>
                                        <th>{isRTL ? 'المورد' : 'Supplier'}</th>
                                        <th>{isRTL ? 'التاريخ' : 'Date'}</th>
                                        <th>{isRTL ? 'الإجمالي' : 'Total'}</th>
                                        <th>{isRTL ? 'الحالة' : 'Status'}</th>
                                        <th className="text-center">{tc.actions || 'Actions'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredInvoices.map(inv => (
                                        <tr key={inv.id} className="cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors" onClick={() => setSelectedOrder(inv)}>
                                            <td className="text-primary-600 dark:text-primary-400 font-bold font-mono">{inv.invoice_number}</td>
                                            <td className="font-medium text-surface-900 dark:text-surface-100">{inv.supplier?.name}</td>
                                            <td className="text-surface-500 font-medium">{inv.invoice_date?.split('T')[0]}</td>
                                            <td className="font-bold text-surface-900 dark:text-white">{formatCurrency(inv.total)}</td>
                                            <td>
                                                <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold border" style={{ background: statusConfig[inv.status]?.bg, color: statusConfig[inv.status]?.color, borderColor: statusConfig[inv.status]?.color + '40' }}>
                                                    {getStatusLabel(inv.status)}
                                                </span>
                                            </td>
                                            <td className="text-center" onClick={e => e.stopPropagation()}>
                                                <button onClick={() => setSelectedOrder(inv)} className="btn-icon w-8 h-8 flex items-center justify-center text-primary-500 hover:text-primary-600 bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800/50 rounded-lg mx-auto transition-all" title={isRTL ? 'عرض الفاتورة' : 'View Invoice'}>
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {activeTab === 'returns' && (
                <>
                    <div className="flex flex-wrap gap-3 mb-4">
                        <div className="relative flex-1 min-w-[250px] max-w-sm">
                            <span className="absolute inset-y-0 start-0 flex items-center ps-3 text-surface-400">🔍</span>
                            <input
                                type="text"
                                placeholder={isRTL ? "بحث رقم أو مورد..." : "Search..."}
                                className="input-field ps-10 w-full"
                                value={searchReturn}
                                onChange={e => setSearchReturn(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    {filteredReturns.length === 0 ? (
                        <div className="glass-card flex flex-col items-center justify-center py-16 px-4 text-center">
                            <span className="text-5xl mb-4 opacity-50">↩️</span>
                            <h3 className="text-lg font-bold text-surface-700 dark:text-surface-300 mb-1">{isRTL ? 'لا توجد مرتجعات' : 'No returns found'}</h3>
                            <p className="text-surface-500 max-w-sm">{isRTL ? 'لم يتم العثور على أي مرتجعات مشتريات تطابق بحثك.' : 'No purchase returns matched your criteria.'}</p>
                        </div>
                    ) : (
                        <div className="glass-card overflow-x-auto">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>{isRTL ? 'رقم المرتجع' : 'Return #'}</th>
                                        <th>{isRTL ? 'الفاتورة الأصلية' : 'Orig. Invoice'}</th>
                                        <th>{isRTL ? 'المورد' : 'Supplier'}</th>
                                        <th>{isRTL ? 'التاريخ' : 'Date'}</th>
                                        <th>{isRTL ? 'الإجمالي' : 'Total'}</th>
                                        <th>{isRTL ? 'الحالة' : 'Status'}</th>
                                        <th className="text-center">{tc.actions || 'Actions'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredReturns.map(ret => (
                                        <tr key={ret.id} className="cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors" onClick={() => setSelectedReturn(ret)}>
                                            <td className="text-primary-600 dark:text-primary-400 font-bold font-mono">{ret.number}</td>
                                            <td className="text-surface-500 font-mono text-xs">{ret.purchaseInvoice?.number || '-'}</td>
                                            <td className="font-medium text-surface-900 dark:text-surface-100">{ret.supplier?.name}</td>
                                            <td className="text-surface-500 font-medium">{ret.issue_date}</td>
                                            <td className="font-bold text-surface-900 dark:text-white">{formatCurrency(ret.total_amount)}</td>
                                            <td>
                                                <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold border" style={{ background: statusConfig[ret.status]?.bg, color: statusConfig[ret.status]?.color, borderColor: statusConfig[ret.status]?.color + '40' }}>
                                                    {getStatusLabel(ret.status)}
                                                </span>
                                            </td>
                                            <td className="text-center" onClick={e => e.stopPropagation()}>
                                                <button onClick={() => setSelectedReturn(ret)} className="btn-icon w-8 h-8 flex items-center justify-center text-primary-500 hover:text-primary-600 bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800/50 rounded-lg mx-auto transition-all" title={isRTL ? 'عرض المرتجع' : 'View Return'}>
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {/* --- NEW/EDIT INVOICE MODAL --- */}
            {showOrderModal && newOrder && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowOrderModal(false)}>
                    <div className="relative w-full max-w-5xl rounded-3xl overflow-hidden bg-white dark:bg-surface-900 shadow-2xl border border-surface-200 dark:border-surface-800 flex flex-col" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh' }}>
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-surface-900 dark:text-white flex items-center gap-2">
                                <span className="text-2xl">{newOrder.id ? '📝' : '📄'}</span>
                                {newOrder.id ? (isRTL ? 'تعديل الفاتورة' : 'Edit Invoice') : (isRTL ? 'فاتورة شراء جديدة' : 'New Purchase Invoice')}
                            </h2>
                            <button onClick={() => setShowOrderModal(false)} className="btn-icon text-surface-400 hover:text-red-500 bg-white dark:bg-surface-800">✕</button>
                        </div>
                        
                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider">{isRTL ? 'المورد' : 'Supplier'}</label>
                                    <div className="relative">
                                        <select className="input-field w-full appearance-none" value={newOrder.supplier_id} onChange={e => setNewOrder({...newOrder, supplier_id: e.target.value})}>
                                            <option value="">{isRTL ? 'اختر المورد...' : 'Select Supplier...'}</option>
                                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider">{isRTL ? 'المستودع' : 'Warehouse'}</label>
                                    <select className="input-field w-full" value={newOrder.warehouse_id} onChange={e => setNewOrder({...newOrder, warehouse_id: e.target.value})}>
                                        <option value="">{isRTL ? 'اختر المستودع للتموين' : 'Warehouse for stocking'}</option>
                                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider">{isRTL ? 'طريقة الدفع' : 'Payment Type'}</label>
                                    <select className="input-field w-full" value={newOrder.payment_type} onChange={e => setNewOrder({...newOrder, payment_type: e.target.value})}>
                                        <option value="cash">{isRTL ? 'نقدي' : 'Cash'}</option>
                                        <option value="credit">{isRTL ? 'آجل' : 'Credit'}</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider">{isRTL ? 'التاريخ' : 'Date'}</label>
                                    <input type="date" className="input-field w-full" value={newOrder.issue_date} onChange={e => setNewOrder({...newOrder, issue_date: e.target.value})}/>
                                </div>
                            </div>
                            <div className="flex items-center justify-between mb-3 border-b border-surface-200 dark:border-surface-800 pb-2">
                                <h3 className="text-lg font-bold text-surface-900 dark:text-white flex items-center gap-2">
                                    <span>📦</span> {isRTL ? 'الأصناف' : 'Items'}
                                </h3>
                                <button onClick={() => setNewOrder({...newOrder, items: [...newOrder.items, {product_id:'', qty:1, unit_price:0, tax_rate:15}]})} className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-bold flex items-center gap-1 bg-primary-50 dark:bg-primary-900/30 px-3 py-1.5 rounded-lg transition-colors">
                                    ➕ {isRTL ? 'إضافة صنف' : 'Add Item'}
                                </button>
                            </div>
                            
                            <div className="overflow-x-auto mb-6 bg-surface-50 dark:bg-surface-800/20 rounded-xl border border-surface-200 dark:border-surface-800">
                                <table className="w-full text-sm text-start">
                                    <thead className="bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 border-b border-surface-200 dark:border-surface-700">
                                        <tr>
                                            <th className="py-3 px-4 font-bold w-[40%] text-start">{isRTL ? 'الصنف' : 'Product'}</th>
                                            <th className="py-3 px-4 font-bold text-center">{isRTL ? 'الكمية' : 'Qty'}</th>
                                            <th className="py-3 px-4 font-bold text-center">{isRTL ? 'السعر (بدون ضريبة)' : 'Price'}</th>
                                            <th className="py-3 px-4 font-bold text-center">{isRTL ? 'الضريبة%' : 'Tax%'}</th>
                                            <th className="py-3 px-4 font-bold text-end">{isRTL ? 'الإجمالي' : 'Total'}</th>
                                            <th className="py-3 px-4 text-center w-12"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-surface-200 dark:divide-surface-800">
                                        {newOrder.items.map((it:any, idx:number) => {
                                            const lineTotal = Number(it.qty) * Number(it.unit_price) * (1 + Number(it.tax_rate) / 100);
                                            return (
                                            <tr key={idx} className="hover:bg-white dark:hover:bg-surface-800/50 transition-colors group">
                                                <td className="py-2 px-3">
                                                    <select className="input-field py-2 w-full bg-transparent border-transparent hover:border-surface-300 dark:hover:border-surface-600 focus:bg-white dark:focus:bg-surface-900" value={it.product_id} onChange={e => {
                                                        const arr = [...newOrder.items]; arr[idx].product_id = e.target.value; setNewOrder({...newOrder, items: arr});
                                                    }}>
                                                        <option value="">{isRTL ? 'اختر منتج...' : 'Select product...'}</option>
                                                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                    </select>
                                                </td>
                                                <td className="py-2 px-3">
                                                    <input type="number" min="1" className="input-field py-2 w-24 text-center bg-transparent border-transparent hover:border-surface-300 dark:hover:border-surface-600 focus:bg-white dark:focus:bg-surface-900 mx-auto" value={it.qty} onChange={e => {
                                                        const arr = [...newOrder.items]; arr[idx].qty = e.target.value; setNewOrder({...newOrder, items: arr});
                                                    }}/>
                                                </td>
                                                <td className="py-2 px-3">
                                                    <input type="number" min="0" step="0.01" className="input-field py-2 w-28 text-center bg-transparent border-transparent hover:border-surface-300 dark:hover:border-surface-600 focus:bg-white dark:focus:bg-surface-900 mx-auto" value={it.unit_price} onChange={e => {
                                                        const arr = [...newOrder.items]; arr[idx].unit_price = e.target.value; setNewOrder({...newOrder, items: arr});
                                                    }}/>
                                                </td>
                                                <td className="py-2 px-3">
                                                    <input type="number" min="0" step="1" className="input-field py-2 w-20 text-center bg-transparent border-transparent hover:border-surface-300 dark:hover:border-surface-600 focus:bg-white dark:focus:bg-surface-900 mx-auto" value={it.tax_rate} onChange={e => {
                                                        const arr = [...newOrder.items]; arr[idx].tax_rate = e.target.value; setNewOrder({...newOrder, items: arr});
                                                    }}/>
                                                </td>
                                                <td className="py-2 px-4 text-end font-bold text-primary-600 dark:text-primary-400">
                                                    {formatCurrency(lineTotal)}
                                                </td>
                                                <td className="py-2 px-3 text-center">
                                                    {newOrder.items.length > 1 && (
                                                        <button onClick={() => {
                                                            const arr = newOrder.items.filter((_:any, i:number) => i !== idx); setNewOrder({...newOrder, items: arr});
                                                        }} className="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100">✕</button>
                                                    )}
                                                </td>
                                            </tr>
                                        )})}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Summary Footer */}
                            <div className="flex flex-col items-end gap-1 mb-2">
                                <div className="text-lg font-bold text-surface-900 dark:text-white flex items-center gap-4 bg-surface-100 dark:bg-surface-800 px-6 py-3 rounded-xl border border-surface-200 dark:border-surface-700 shadow-sm">
                                    <span>{isRTL ? 'إجمالي الفاتورة المتوقع:' : 'Expected Total:'}</span>
                                    <span className="text-2xl text-primary-600 dark:text-primary-400">
                                        {formatCurrency(newOrder.items.reduce((acc:number, it:any) => acc + (Number(it.qty) * Number(it.unit_price) * (1 + Number(it.tax_rate) / 100)), 0))}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer Actions */}
                        <div className="px-6 py-4 border-t border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50 flex flex-col-reverse sm:flex-row gap-3 justify-between items-center">
                            <button onClick={() => setShowOrderModal(false)} className="w-full sm:w-auto px-6 py-2.5 font-bold text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-xl transition-colors">
                                {isRTL ? 'إلغاء' : 'Cancel'}
                            </button>
                            <div className="flex w-full sm:w-auto gap-3">
                                <button onClick={() => handleSaveOrder('draft')} className="w-full sm:w-auto px-6 py-2.5 font-bold bg-white dark:bg-surface-700 text-surface-700 dark:text-surface-200 border border-surface-200 dark:border-surface-600 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-600 hover:shadow-sm transition-all shadow-sm">
                                    {isRTL ? 'حفظ كمسودة' : 'Save as Draft'}
                                </button>
                                <button onClick={() => handleSaveOrder('pending')} className="w-full sm:w-auto btn-primary px-8 py-2.5 font-bold shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 hover:-translate-y-0.5 transition-all">
                                    {isRTL ? 'تأكيد وحفظ' : 'Confirm & Save'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- VIEW INVOICE MODAL --- */}
            {selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={() => setSelectedOrder(null)}>
                    <div className="relative w-full max-w-3xl rounded-2xl glass-card p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-xl font-bold">{isRTL ? 'الفاتورة' : 'Invoice'} #{selectedOrder.number}</h2>
                                <p className="text-surface-400 text-sm mt-1">{selectedOrder.supplier?.name} | {selectedOrder.issue_date}</p>
                            </div>
                            <span className="px-3 py-1 rounded text-sm" style={{ background: statusConfig[selectedOrder.status]?.bg, color: statusConfig[selectedOrder.status]?.color }}>
                                {getStatusLabel(selectedOrder.status)}
                            </span>
                        </div>
                        
                        <div className="mb-6 border border-white/5 rounded-xl overflow-hidden">
                            <table className="data-table w-full text-sm">
                                <thead className="bg-white/5">
                                    <tr>
                                        <th className="py-2 px-4 text-start">{isRTL ? 'الصنف' : 'Item'}</th>
                                        <th className="py-2 px-4">{isRTL ? 'الكمية' : 'Qty'}</th>
                                        <th className="py-2 px-4">{isRTL ? 'السعر' : 'Unit Price'}</th>
                                        <th className="py-2 px-4 text-end">{isRTL ? 'الإجمالي' : 'Total'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedOrder.items?.map((it:any) => (
                                        <tr key={it.id} className="border-t border-white/5">
                                            <td className="py-2 px-4">{it.product?.name || it.product_id}</td>
                                            <td className="py-2 px-4">{Number(it.quantity)}</td>
                                            <td className="py-2 px-4">{formatCurrency(it.unit_price)}</td>
                                            <td className="py-2 px-4 text-end text-primary font-medium">{formatCurrency(it.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="bg-surface-hover rounded-xl p-4 flex flex-col gap-2 mb-6">
                            <div className="flex justify-between text-sm"><span>{isRTL ? 'المدفوع' : 'Paid'}</span><span className="text-emerald-400">{formatCurrency(selectedOrder.paid_amount)}</span></div>
                            <div className="flex justify-between font-bold text-lg border-t border-white/10 pt-2 text-white"><span>{isRTL ? 'الإجمالي' : 'Total'}</span><span>{formatCurrency(selectedOrder.total_amount)}</span></div>
                        </div>

                        <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
                            <button onClick={() => setSelectedOrder(null)} className="px-4 py-2 text-surface-400">{isRTL ? 'إغلاق' : 'Close'}</button>
                            {(selectedOrder.status === 'draft' || selectedOrder.status === 'pending') && (
                                <button onClick={() => openEditOrder(selectedOrder)} className="px-4 py-2 rounded-lg bg-surface-hover text-primary">{isRTL ? 'تعديل الفاتورة' : 'Edit'}</button>
                            )}
                            {selectedOrder.status === 'pending' && (
                                <button onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'received')} className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400">✓ {isRTL ? 'استلام المخزون' : 'Receive Stock'}</button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- NEW RETURN MODAL --- */}
            {showReturnModal && newReturn && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowReturnModal(false)}>
                    <div className="relative w-full max-w-5xl rounded-3xl overflow-hidden bg-white dark:bg-surface-900 shadow-2xl border border-surface-200 dark:border-surface-800 flex flex-col" onClick={e=>e.stopPropagation()} style={{ maxHeight: '90vh' }}>
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-surface-900 dark:text-white flex items-center gap-2">
                                <span className="text-2xl">↩️</span>
                                {isRTL ? 'تسجيل مرتجع مشتريات' : 'New Purchase Return'}
                            </h2>
                            <button onClick={() => setShowReturnModal(false)} className="btn-icon text-surface-400 hover:text-red-500 bg-white dark:bg-surface-800">✕</button>
                        </div>
                        
                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider">{isRTL ? 'المورد' : 'Supplier'}</label>
                                    <select className="input-field w-full" value={newReturn.supplier_id} onChange={e => setNewReturn({...newReturn, supplier_id: e.target.value})}>
                                        <option value="">{isRTL ? 'اختر المورد...' : 'Select Supplier...'}</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-surface-500 uppercase tracking-wider">{isRTL ? 'المستودع (لسحب المخزون)' : 'Warehouse (to deduct from)'}</label>
                                    <select className="input-field w-full" value={newReturn.warehouse_id} onChange={e => setNewReturn({...newReturn, warehouse_id: e.target.value})}>
                                        <option value="">{isRTL ? 'اختر المستودع...' : 'Select Warehouse...'}</option>
                                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mb-3 border-b border-surface-200 dark:border-surface-800 pb-2">
                                <h3 className="text-lg font-bold text-surface-900 dark:text-white flex items-center gap-2">
                                    <span>📦</span> {isRTL ? 'الأصناف المسترجعة' : 'Returned Items'}
                                </h3>
                                <button onClick={() => setNewReturn({...newReturn, items: [...newReturn.items, {product_id:'', qty:1, unit_price:0, tax_rate:0}]})} className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-bold flex items-center gap-1 bg-primary-50 dark:bg-primary-900/30 px-3 py-1.5 rounded-lg transition-colors">
                                    ➕ {isRTL ? 'إضافة صنف' : 'Add Item'}
                                </button>
                            </div>

                            <div className="overflow-x-auto mb-6 bg-surface-50 dark:bg-surface-800/20 rounded-xl border border-surface-200 dark:border-surface-800">
                                <table className="w-full text-sm text-start">
                                    <thead className="bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 border-b border-surface-200 dark:border-surface-700">
                                        <tr>
                                            <th className="py-3 px-4 font-bold w-[50%] text-start">{isRTL ? 'الصنف' : 'Product'}</th>
                                            <th className="py-3 px-4 font-bold text-center">{isRTL ? 'الكمية' : 'Qty'}</th>
                                            <th className="py-3 px-4 font-bold text-center">{isRTL ? 'سعر الاسترجاع' : 'Return Price'}</th>
                                            <th className="py-3 px-4 font-bold text-end">{isRTL ? 'الإجمالي' : 'Total'}</th>
                                            <th className="py-3 px-4 text-center w-12"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-surface-200 dark:divide-surface-800">
                                        {newReturn.items.map((it:any, idx:number) => {
                                            const lineTotal = Number(it.qty) * Number(it.unit_price);
                                            return (
                                            <tr key={idx} className="hover:bg-white dark:hover:bg-surface-800/50 transition-colors group">
                                                <td className="py-2 px-3">
                                                    <select className="input-field py-2 w-full bg-transparent border-transparent hover:border-surface-300 dark:hover:border-surface-600 focus:bg-white dark:focus:bg-surface-900" value={it.product_id} onChange={e => {
                                                        const arr = [...newReturn.items]; arr[idx].product_id = e.target.value; setNewReturn({...newReturn, items: arr});
                                                    }}>
                                                        <option value="">{isRTL ? 'اختر منتج...' : 'Select product...'}</option>
                                                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                    </select>
                                                </td>
                                                <td className="py-2 px-3">
                                                    <input type="number" min="1" className="input-field py-2 w-24 text-center bg-transparent border-transparent hover:border-surface-300 dark:hover:border-surface-600 focus:bg-white dark:focus:bg-surface-900 mx-auto" value={it.qty} onChange={e => {
                                                        const arr = [...newReturn.items]; arr[idx].qty = e.target.value; setNewReturn({...newReturn, items: arr});
                                                    }}/>
                                                </td>
                                                <td className="py-2 px-3">
                                                    <input type="number" min="0" step="0.01" className="input-field py-2 w-28 text-center bg-transparent border-transparent hover:border-surface-300 dark:hover:border-surface-600 focus:bg-white dark:focus:bg-surface-900 mx-auto" value={it.unit_price} onChange={e => {
                                                        const arr = [...newReturn.items]; arr[idx].unit_price = e.target.value; setNewReturn({...newReturn, items: arr});
                                                    }}/>
                                                </td>
                                                <td className="py-2 px-4 text-end font-bold text-primary-600 dark:text-primary-400">
                                                    {formatCurrency(lineTotal)}
                                                </td>
                                                <td className="py-2 px-3 text-center">
                                                    {newReturn.items.length > 1 && (
                                                        <button onClick={() => {
                                                            const arr = newReturn.items.filter((_:any, i:number) => i !== idx); setNewReturn({...newReturn, items: arr});
                                                        }} className="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100">✕</button>
                                                    )}
                                                </td>
                                            </tr>
                                        )})}
                                    </tbody>
                                </table>
                            </div>

                            {/* Summary Footer */}
                            <div className="flex flex-col items-end gap-1 mb-2">
                                <div className="text-lg font-bold text-surface-900 dark:text-white flex items-center gap-4 bg-surface-100 dark:bg-surface-800 px-6 py-3 rounded-xl border border-surface-200 dark:border-surface-700 shadow-sm">
                                    <span>{isRTL ? 'إجمالي المرتجع:' : 'Expected Return Total:'}</span>
                                    <span className="text-2xl text-primary-600 dark:text-primary-400">
                                        {formatCurrency(newReturn.items.reduce((acc:number, it:any) => acc + (Number(it.qty) * Number(it.unit_price)), 0))}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer Actions */}
                        <div className="px-6 py-4 border-t border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50 flex flex-col-reverse sm:flex-row gap-3 justify-between items-center">
                            <button onClick={() => setShowReturnModal(false)} className="w-full sm:w-auto px-6 py-2.5 font-bold text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-xl transition-colors">
                                {isRTL ? 'إلغاء' : 'Cancel'}
                            </button>
                            <div className="flex w-full sm:w-auto gap-3">
                                <button onClick={() => handleSaveReturn('draft')} className="w-full sm:w-auto px-6 py-2.5 font-bold bg-white dark:bg-surface-700 text-surface-700 dark:text-surface-200 border border-surface-200 dark:border-surface-600 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-600 hover:shadow-sm transition-all shadow-sm">
                                    {isRTL ? 'حفظ كمسودة' : 'Save as Draft'}
                                </button>
                                <button onClick={() => handleSaveReturn('completed')} className="w-full sm:w-auto btn-primary px-8 py-2.5 font-bold shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 hover:-translate-y-0.5 transition-all">
                                    {isRTL ? 'تنفيذ المرتجع (وخصم المخزون)' : 'Complete Return & Deduct'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- VIEW RETURN MODAL --- */}
            {selectedReturn && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={() => setSelectedReturn(null)}>
                    <div className="relative w-full max-w-3xl rounded-2xl glass-card p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-xl font-bold">{isRTL ? 'مرتجع مشتريات' : 'Purchase Return'} #{selectedReturn.number}</h2>
                                <p className="text-surface-400 text-sm mt-1">{selectedReturn.supplier?.name} | {selectedReturn.issue_date}</p>
                            </div>
                            <span className="px-3 py-1 rounded text-sm" style={{ background: statusConfig[selectedReturn.status]?.bg, color: statusConfig[selectedReturn.status]?.color }}>
                                {getStatusLabel(selectedReturn.status)}
                            </span>
                        </div>
                        
                        <div className="bg-surface-hover p-4 rounded-xl border-l-4 border-primary mb-4">
                            <p className="text-sm">
                                {isRTL ? 'إجمالي قيمة المرتجع (مخصوم من حساب المورد):' : 'Total Return Value (Deducted from Supplier Balance): '}
                                <span className="text-white font-bold ms-2">{formatCurrency(selectedReturn.total_amount)}</span>
                            </p>
                        </div>

                        <div className="mb-6 border border-white/5 rounded-xl overflow-hidden">
                            <table className="data-table w-full text-sm">
                                <thead className="bg-white/5">
                                    <tr>
                                        <th className="py-2 px-4 text-start">{isRTL ? 'الصنف' : 'Item'}</th>
                                        <th className="py-2 px-4">{isRTL ? 'الكمية المسترجعة' : 'Return Qty'}</th>
                                        <th className="py-2 px-4 text-end">{isRTL ? 'الإجمالي المخفض' : 'Sub Total'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedReturn.items?.map((it:any) => (
                                        <tr key={it.id} className="border-t border-white/5">
                                            <td className="py-2 px-4">{it.product?.name || it.product_id}</td>
                                            <td className="py-2 px-4">{Number(it.quantity)}</td>
                                            <td className="py-2 px-4 text-end font-medium">{formatCurrency(it.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
                            <button onClick={() => setSelectedReturn(null)} className="px-4 py-2 text-surface-400">{isRTL ? 'إغلاق' : 'Close'}</button>
                            {selectedReturn.status === 'draft' && (
                                <button onClick={() => handleCompleteReturn(selectedReturn.id, warehouses[0]?.id)} className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400">✓ {isRTL ? 'اعتماد المرتجع وخصم المخزون' : 'Complete & Deduct Stock'}</button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
