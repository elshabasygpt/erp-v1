'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DeleteConfirmModal, ViewAccountModal, CustomerGroupsModal, ImportCustomersModal } from './CustomerModals';
import { exportTableToPDF } from '@/lib/pdf-export';
import { crmApi } from '@/lib/api';

// ── Types ──
interface Customer {
    id: string; name: string; nameAr: string; phone: string; email: string; address: string;
    group: string; paymentType: 'cash' | 'credit'; status: string;
    totalPurchases: number; balance: number; creditLimit: number; paymentTerms: number;
    lastOrder: string; orders: number; taxNumber?: string; commercialRegister?: string;
}

// ── Initial Data ──
const initialCustomers: Customer[] = [
    { id: 'C-001', name: 'ABC Trading Co.', nameAr: 'شركة ABC للتجارة', phone: '0501234567', email: 'info@abc.com', address: 'Riyadh', group: 'vip', paymentType: 'credit', status: 'active', totalPurchases: 245000, balance: 12000, creditLimit: 50000, paymentTerms: 30, lastOrder: '2026-02-23', orders: 43 },
    { id: 'C-002', name: 'XYZ Corp', nameAr: 'مؤسسة XYZ', phone: '0559876543', email: 'sales@xyz.sa', address: 'Jeddah', group: 'wholesale', paymentType: 'credit', status: 'active', totalPurchases: 189000, balance: 8500, creditLimit: 30000, paymentTerms: 15, lastOrder: '2026-02-22', orders: 31 },
    { id: 'C-003', name: 'Gulf Traders', nameAr: 'تجار الخليج', phone: '0561112233', email: 'gulf@trade.com', address: 'Dammam', group: 'wholesale', paymentType: 'credit', status: 'active', totalPurchases: 142000, balance: 0, creditLimit: 25000, paymentTerms: 30, lastOrder: '2026-02-21', orders: 27 },
    { id: 'C-004', name: 'Star Electronics', nameAr: 'ستار للإلكترونيات', phone: '0504445566', email: 'star@elec.sa', address: 'Riyadh', group: 'retail', paymentType: 'cash', status: 'active', totalPurchases: 118000, balance: 0, creditLimit: 0, paymentTerms: 0, lastOrder: '2026-02-20', orders: 22 },
    { id: 'C-005', name: 'Al-Wataniya Foods', nameAr: 'الوطنية للأغذية', phone: '0507778899', email: 'info@wataniya.sa', address: 'Tabuk', group: 'vip', paymentType: 'credit', status: 'active', totalPurchases: 95000, balance: 15000, creditLimit: 40000, paymentTerms: 45, lastOrder: '2026-02-19', orders: 18 },
    { id: 'C-006', name: 'Tech Hub', nameAr: 'تك هب', phone: '0533334455', email: 'info@techhub.sa', address: 'Khobar', group: 'retail', paymentType: 'cash', status: 'active', totalPurchases: 67000, balance: 0, creditLimit: 0, paymentTerms: 0, lastOrder: '2026-02-18', orders: 15 },
    { id: 'C-007', name: 'City Store', nameAr: 'متجر المدينة', phone: '0512223344', email: 'city@store.sa', address: 'Madinah', group: 'individual', paymentType: 'cash', status: 'inactive', totalPurchases: 23000, balance: 0, creditLimit: 0, paymentTerms: 0, lastOrder: '2026-01-15', orders: 8 },
    { id: 'C-008', name: 'Noor Trading', nameAr: 'نور للتجارة', phone: '0545556677', email: 'noor@trade.sa', address: 'Abha', group: 'wholesale', paymentType: 'credit', status: 'active', totalPurchases: 54000, balance: 3200, creditLimit: 20000, paymentTerms: 30, lastOrder: '2026-02-17', orders: 12 },
    { id: 'C-009', name: 'Fahad Supplies', nameAr: 'مستلزمات فهد', phone: '0578889900', email: 'fahad@sup.sa', address: 'Riyadh', group: 'individual', paymentType: 'cash', status: 'active', totalPurchases: 31000, balance: 0, creditLimit: 0, paymentTerms: 0, lastOrder: '2026-02-16', orders: 9 },
    { id: 'C-010', name: 'Royal Office', nameAr: 'المكتب الملكي', phone: '0566667788', email: 'royal@office.sa', address: 'Jeddah', group: 'vip', paymentType: 'credit', status: 'inactive', totalPurchases: 78000, balance: 22000, creditLimit: 35000, paymentTerms: 30, lastOrder: '2026-01-20', orders: 14 },
];

interface Props { dict: any; locale: string; }

export default function CustomersContent({ dict, locale }: Props) {
    const isRTL = locale === 'ar';
    const c = dict.customers;

    // ── State ──
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [groupFilter, setGroupFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [paymentFilter, setPaymentFilter] = useState('all');

    // Modal states
    const [showAddEdit, setShowAddEdit] = useState(false);
    const [showDelete, setShowDelete] = useState<Customer | null>(null);
    const [showAccount, setShowAccount] = useState<Customer | null>(null);
    const [showGroups, setShowGroups] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

    // ── Fetch data ──
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchCustomers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await crmApi.getCustomers();
            const apiCustomers = res.data?.data?.data || res.data?.data || [];
            const formatted = apiCustomers.map((c: any) => ({
                id: c.id?.toString() || c.customer_code,
                name: c.name || '',
                nameAr: c.name_ar || c.name || '',
                phone: c.phone || '',
                email: c.email || '',
                address: c.address || '',
                group: c.group || 'retail',
                paymentType: c.payment_type || 'cash',
                status: c.status || 'active',
                totalPurchases: Number(c.total_purchases || 0),
                balance: Number(c.balance || 0),
                creditLimit: Number(c.credit_limit || 0),
                paymentTerms: Number(c.payment_terms || 0),
                lastOrder: c.last_order || '-',
                orders: Number(c.orders_count || 0),
                taxNumber: c.tax_number || '',
                commercialRegister: c.commercial_register || ''
            }));
            setCustomers(formatted);
        } catch (error) {
            console.error('Failed fetching customers:', error);
            showToast(isRTL ? 'فشل تحميل بيانات العملاء' : 'Failed to load customers', 'error');
        }
        setLoading(false);
    }, [isRTL]);

    useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

    // Form
    const emptyForm = { name: '', nameAr: '', phone: '', email: '', address: '', group: 'retail', paymentType: 'cash' as 'cash' | 'credit', creditLimit: 0, paymentTerms: 0, taxNumber: '', commercialRegister: '' };
    const [form, setForm] = useState(emptyForm);

    const formatCurrency = (val: number) => new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', { style: 'currency', currency: 'SAR', minimumFractionDigits: 0 }).format(val);
    const groupLabel = (g: string) => ({ vip: c.groupVip, wholesale: c.groupWholesale, retail: c.groupRetail, individual: c.groupIndividual }[g] || g);
    const groupBadge = (g: string) => ({ vip: 'badge-warning', wholesale: 'badge-info', retail: 'badge-success', individual: 'badge bg-surface-200/10 text-surface-200/60' }[g] || 'badge-info');

    // ── Filters ──
    const filtered = useMemo(() => customers.filter(cu => {
        const name = isRTL ? cu.nameAr : cu.name;
        return (!search || name.toLowerCase().includes(search.toLowerCase()) || cu.id.toLowerCase().includes(search.toLowerCase()) || cu.phone.includes(search))
            && (groupFilter === 'all' || cu.group === groupFilter)
            && (statusFilter === 'all' || cu.status === statusFilter)
            && (paymentFilter === 'all' || cu.paymentType === paymentFilter);
    }), [customers, search, groupFilter, statusFilter, paymentFilter, isRTL]);

    // ── CRUD Operations ──
    const openAdd = () => { setEditingCustomer(null); setForm(emptyForm); setShowAddEdit(true); };
    const openEdit = (cu: Customer) => {
        setEditingCustomer(cu);
        setForm({ name: cu.name, nameAr: cu.nameAr, phone: cu.phone, email: cu.email, address: cu.address, group: cu.group, paymentType: cu.paymentType, creditLimit: cu.creditLimit, paymentTerms: cu.paymentTerms, taxNumber: cu.taxNumber || '', commercialRegister: cu.commercialRegister || '' });
        setShowAddEdit(true);
    };

    const saveCustomer = useCallback(async () => {
        if (!form.name && !form.nameAr) return;
        setSaving(true);
        const payload = {
            name: form.name || form.nameAr,
            name_ar: form.nameAr || form.name,
            phone: form.phone,
            email: form.email,
            address: form.address,
            group: form.group,
            payment_type: form.paymentType,
            credit_limit: form.paymentType === 'credit' ? form.creditLimit : 0,
            payment_terms: form.paymentType === 'credit' ? form.paymentTerms : 0,
            tax_number: form.taxNumber,
            commercial_register: form.commercialRegister,
        };
        try {
            if (editingCustomer) {
                await crmApi.updateCustomer(editingCustomer.id, payload);
                showToast(isRTL ? 'تم تحديث بيانات العميل بنجاح ✓' : 'Customer updated successfully ✓');
            } else {
                await crmApi.createCustomer(payload);
                showToast(isRTL ? 'تم إضافة العميل بنجاح ✓' : 'Customer added successfully ✓');
            }
            setShowAddEdit(false);
            fetchCustomers();
        } catch (err: any) {
            showToast(err?.response?.data?.message || (isRTL ? 'فشل الحفظ، تحقق من البيانات' : 'Save failed, check inputs'), 'error');
        } finally {
            setSaving(false);
        }
    }, [form, editingCustomer, isRTL, fetchCustomers]);

    const deleteCustomer = useCallback(async () => {
        if (!showDelete) return;
        try {
            await crmApi.deleteCustomer(showDelete.id);
            showToast(isRTL ? 'تم حذف العميل بنجاح' : 'Customer deleted', 'success');
            setShowDelete(null);
            fetchCustomers();
        } catch (err: any) {
            showToast(err?.response?.data?.message || (isRTL ? 'فشل الحذف' : 'Delete failed'), 'error');
            setShowDelete(null);
        }
    }, [showDelete, isRTL, fetchCustomers]);

    // ── Export CSV ──
    const exportCSV = useCallback(async () => {
        try {
            const { crmApi } = await import('@/lib/api');
            const blob = await crmApi.exportCustomers();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'customers.xlsx'; a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Failed to export', e);
            alert(isRTL ? 'فشل التصدير' : 'Export failed');
        }
    }, [isRTL]);

    // ── Action Handler ──
    const handleAction = (key: string) => {
        switch (key) {
            case 'add': openAdd(); break;
            case 'import': setShowImport(true); break;
            case 'export': exportCSV(); break;
            case 'report': {
                const headers = [
                    isRTL ? 'الكود' : 'Code',
                    isRTL ? 'الاسم' : 'Name',
                    isRTL ? 'الهاتف' : 'Phone',
                    isRTL ? 'المجموعة' : 'Group',
                    isRTL ? 'النوع' : 'Type',
                    isRTL ? 'إجمالي المشتريات' : 'Total Purchases',
                    isRTL ? 'الرصيد' : 'Balance',
                    isRTL ? 'الحالة' : 'Status',
                ];
                const rows = customers.map(cu => [
                    cu.id,
                    isRTL ? cu.nameAr : cu.name,
                    cu.phone,
                    groupLabel(cu.group),
                    cu.paymentType === 'credit' ? (isRTL ? 'آجل' : 'Credit') : (isRTL ? 'نقدي' : 'Cash'),
                    formatCurrency(cu.totalPurchases),
                    formatCurrency(cu.balance),
                    cu.status === 'active' ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'غير نشط' : 'Inactive'),
                ]);
                const summaryCards = [
                    { label: isRTL ? 'إجمالي العملاء' : 'Total Customers', value: String(customers.length) },
                    { label: isRTL ? 'إجمالي المبيعات' : 'Total Revenue', value: formatCurrency(totalRevenue) },
                    { label: isRTL ? 'الرصيد المستحق' : 'Outstanding', value: formatCurrency(outstanding) },
                    { label: isRTL ? 'عملاء نشطون' : 'Active', value: String(customers.filter(c => c.status === 'active').length) },
                ];
                exportTableToPDF(
                    isRTL ? 'تقرير العملاء' : 'Customers Report',
                    isRTL ? `إجمالي ${customers.length} عميل` : `Total ${customers.length} customers`,
                    headers,
                    rows,
                    summaryCards,
                    isRTL
                );
                break;
            }
            case 'groups': setShowGroups(true); break;
        }
    };

    // ── Stats ──
    const totalRevenue = customers.reduce((s, cu) => s + cu.totalPurchases, 0);
    const outstanding = customers.reduce((s, cu) => s + cu.balance, 0);
    const stats = [
        { label: c.totalCustomers, value: customers.length.toString(), change: '+12%', positive: true, icon: '👥', gradient: 'from-blue-500/20 to-blue-600/5' },
        { label: c.newThisMonth, value: '4', change: '+33%', positive: true, icon: '🆕', gradient: 'from-green-500/20 to-green-600/5' },
        { label: c.totalRevenue, value: formatCurrency(totalRevenue), change: '+18%', positive: true, icon: '💰', gradient: 'from-purple-500/20 to-purple-600/5' },
        { label: c.outstandingBalance, value: formatCurrency(outstanding), change: '-5%', positive: false, icon: '⚖️', gradient: 'from-red-500/20 to-red-600/5' },
    ];

    const actionBtns = [
        { key: 'import', label: c.importCustomers, icon: '📥' },
        { key: 'export', label: c.exportCustomers, icon: '📤' },
        { key: 'report', label: c.customerReport, icon: '📊' },
        { key: 'groups', label: c.customerGroups, icon: '🏷️' },
    ];

    const chartData = [...customers].sort((a, b) => b.totalPurchases - a.totalPurchases).slice(0, 5).map(cu => ({ name: isRTL ? cu.nameAr : cu.name, value: cu.totalPurchases }));
    const lblCls = "block text-xs font-medium mb-1.5 uppercase tracking-wider";

    return (
        <div className="space-y-6 animate-fade-in p-4 sm:p-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-6 ${isRTL ? 'left-6' : 'right-6'} z-[200] px-5 py-3 rounded-2xl shadow-2xl text-white text-sm font-bold flex items-center gap-2 animate-scale-in ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                    {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
                </div>
            )}
            {/* Header */}
            <div className="glass-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-4 border-l-primary-500">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
                        <div className="p-2 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-lg">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        {c.title}
                    </h1>
                    <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>{c.subtitle}</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    {actionBtns.map(a => (
                        <button key={a.key} onClick={() => handleAction(a.key)} className="btn-secondary flex items-center gap-2 px-3 py-2 text-xs" title={a.label}>
                            <span>{a.icon}</span> <span className="hidden sm:inline">{a.label}</span>
                        </button>
                    ))}
                    <button onClick={openAdd} className="btn-primary flex items-center gap-2 shadow-lg shadow-primary-500/30 text-xs py-2.5">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                        {c.addCustomer}
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {stats.map((s, i) => (
                    <div key={i} className="stat-card relative overflow-hidden group">
                        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${s.gradient} opacity-50 transition-opacity group-hover:opacity-100`} />
                        <div className="relative flex items-start justify-between p-2">
                            <div>
                                <p className="text-sm font-medium mb-1 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{s.label}</p>
                                <p className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
                                <p className={`text-xs mt-2 font-medium ${s.positive ? 'text-emerald-500' : 'text-red-500'}`}>{s.change} {isRTL ? 'مقارنة بالشهر الماضي' : 'vs last month'}</p>
                            </div>
                            <span className="text-4xl opacity-80 group-hover:scale-110 transition-transform">{s.icon}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Chart + Table */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="glass-card p-6">
                    <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>📊 {c.topCustomers}</h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={chartData} layout="vertical" margin={{ left: isRTL ? 16 : 0, right: isRTL ? 40 : 16 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
                            <XAxis type="number" reversed={isRTL} orientation="bottom" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                            <YAxis dataKey="name" type="category" orientation={isRTL ? "right" : "left"} width={isRTL ? 140 : 90} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                            <Tooltip contentStyle={{ background: 'var(--bg-modal)', border: '1px solid var(--border-default)', borderRadius: '12px', color: 'var(--text-primary)' }} formatter={(value: number) => [formatCurrency(value), isRTL ? 'المشتريات' : 'Purchases']} />
                            <Bar dataKey="value" fill="#6366f1" radius={isRTL ? [6, 0, 0, 6] : [0, 6, 6, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="lg:col-span-2 glass-card p-6">
                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-3 mb-5">
                        <h3 className="text-base font-semibold me-auto" style={{ color: 'var(--text-primary)' }}>👥 {c.title}<span className="text-xs font-normal ms-2 px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-surface-secondary)', color: 'var(--text-muted)' }}>{filtered.length}</span></h3>
                        <div className="relative">
                            <svg className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <input className="input-field ps-10 py-2 text-sm w-52" placeholder={c.searchPlaceholder} value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                        <select className="select-field py-2 text-sm w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="all">{c.allStatuses}</option><option value="active">{c.active}</option><option value="inactive">{c.inactive}</option></select>
                        <select className="select-field py-2 text-sm w-auto" value={groupFilter} onChange={e => setGroupFilter(e.target.value)}><option value="all">{c.allGroups}</option><option value="vip">{c.groupVip}</option><option value="wholesale">{c.groupWholesale}</option><option value="retail">{c.groupRetail}</option><option value="individual">{c.groupIndividual}</option></select>
                        <select className="select-field py-2 text-sm w-auto" value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)}><option value="all">{c.paymentType}</option><option value="cash">{c.cashCustomer}</option><option value="credit">{c.creditCustomer}</option></select>
                    </div>

                    {/* Table */}
                    {filtered.length === 0 ? (
                        <div className="text-center py-12"><span className="text-4xl mb-3 block">🔍</span><p style={{ color: 'var(--text-muted)' }}>{c.noCustomers}</p></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="data-table text-sm">
                                <thead><tr><th>{c.code}</th><th>{c.customerName}</th><th>{c.phone}</th><th>{c.group}</th><th>{c.paymentType}</th><th>{c.totalPurchases}</th><th>{c.balance}</th><th>{c.status}</th><th>{dict.common.actions}</th></tr></thead>
                                <tbody>
                                    {filtered.map(cu => {
                                        const pct = cu.creditLimit > 0 ? Math.round((cu.balance / cu.creditLimit) * 100) : 0;
                                        return (
                                            <tr key={cu.id}>
                                                <td className="font-mono text-primary-400 font-medium">{cu.id}</td>
                                                <td><div style={{ color: 'var(--text-primary)' }} className="font-medium">{isRTL ? cu.nameAr : cu.name}</div><div className="text-xs" style={{ color: 'var(--text-muted)' }}>{cu.email}</div></td>
                                                <td style={{ color: 'var(--text-secondary)' }}>{cu.phone}</td>
                                                <td><span className={`badge ${groupBadge(cu.group)}`}>{groupLabel(cu.group)}</span></td>
                                                <td><span className={`badge ${cu.paymentType === 'credit' ? 'badge-info' : 'badge-success'}`}>{cu.paymentType === 'credit' ? c.creditCustomer : c.cashCustomer}</span></td>
                                                <td style={{ color: 'var(--text-primary)' }} className="font-medium">{formatCurrency(cu.totalPurchases)}</td>
                                                <td>{cu.paymentType === 'credit' ? (<div><span className={`font-medium ${cu.balance > 0 ? 'text-red-500' : 'text-green-500'}`}>{formatCurrency(cu.balance)}</span>{cu.creditLimit > 0 && (<div className="mt-1"><div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface-secondary)' }}><div className={`h-full rounded-full ${pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} /></div><span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{pct}%</span></div>)}</div>) : <span className="text-green-500">—</span>}</td>
                                                <td><span className={`inline-flex items-center gap-1.5 text-xs ${cu.status === 'active' ? 'text-green-500' : 'text-red-400'}`}><span className={`w-1.5 h-1.5 rounded-full ${cu.status === 'active' ? 'bg-green-500' : 'bg-red-400'}`} />{cu.status === 'active' ? c.active : c.inactive}</span></td>
                                                <td>
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={() => setShowAccount(cu)} className="btn-icon text-xs" style={{ color: 'var(--text-muted)' }}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg></button>
                                                        <button onClick={() => openEdit(cu)} className="btn-icon text-xs" style={{ color: 'var(--text-muted)' }}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg></button>
                                                        <button onClick={() => setShowDelete(cu)} className="btn-icon text-xs hover:!text-red-400" style={{ color: 'var(--text-muted)' }}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Add/Edit Modal ── */}
            {showAddEdit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && setShowAddEdit(false)}>
                    <div className="bg-white dark:bg-surface-900 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl animate-scale-in">
                        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white/80 dark:bg-surface-900/80 backdrop-blur-md z-10" style={{ borderColor: 'var(--border-default)' }}>
                            <div className="flex items-center gap-2">
                                <span className="text-xl">{editingCustomer ? '✏️' : '➕'}</span>
                                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{editingCustomer ? c.editCustomer : c.addCustomer}</h2>
                            </div>
                            <button onClick={() => setShowAddEdit(false)} className="btn-icon">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-5 space-y-5">
                            <div><h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}><span className="w-1.5 h-1.5 rounded-full bg-primary-500" />{c.basicInfo}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div><label className={lblCls} style={{ color: 'var(--text-muted)' }}>{c.customerName} (AR)</label><input className="input-field py-2 text-sm" value={form.nameAr} onChange={e => setForm({ ...form, nameAr: e.target.value })} /></div>
                                    <div><label className={lblCls} style={{ color: 'var(--text-muted)' }}>{c.customerName} (EN)</label><input className="input-field py-2 text-sm" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} dir="ltr" /></div>
                                    <div><label className={lblCls} style={{ color: 'var(--text-muted)' }}>{c.phone}</label><input className="input-field py-2 text-sm" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                                    <div><label className={lblCls} style={{ color: 'var(--text-muted)' }}>{c.email}</label><input className="input-field py-2 text-sm" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                                    <div><label className={lblCls} style={{ color: 'var(--text-muted)' }}>{c.address}</label><input className="input-field py-2 text-sm" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
                                    <div><label className={lblCls} style={{ color: 'var(--text-muted)' }}>{c.group}</label><select className="select-field py-2 text-sm" value={form.group} onChange={e => setForm({ ...form, group: e.target.value })}><option value="vip">{c.groupVip}</option><option value="wholesale">{c.groupWholesale}</option><option value="retail">{c.groupRetail}</option><option value="individual">{c.groupIndividual}</option></select></div>
                                    <div className="md:col-span-2"><label className={lblCls} style={{ color: 'var(--text-muted)' }}>{c.paymentType}</label><select className="select-field py-2 text-sm" value={form.paymentType} onChange={e => setForm({ ...form, paymentType: e.target.value as any })}><option value="cash">{c.cashCustomer}</option><option value="credit">{c.creditCustomer}</option></select></div>
                                </div>
                            </div>
                            {form.paymentType === 'credit' && (
                                <div><h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}><span className="w-1.5 h-1.5 rounded-full bg-blue-500" />{c.creditInfo}</h3>
                                    <div className="glass-card p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div><label className={lblCls} style={{ color: 'var(--text-muted)' }}>{c.creditLimit}</label><input type="number" className="input-field py-2 text-sm" min="0" value={form.creditLimit} onChange={e => setForm({ ...form, creditLimit: +e.target.value || 0 })} /></div>
                                        <div><label className={lblCls} style={{ color: 'var(--text-muted)' }}>{c.paymentTerms}</label><input type="number" className="input-field py-2 text-sm" min="0" value={form.paymentTerms} onChange={e => setForm({ ...form, paymentTerms: +e.target.value || 0 })} /></div>
                                    </div>
                                </div>
                            )}
                            <div><h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}><span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />{c.businessInfo}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div><label className={lblCls} style={{ color: 'var(--text-muted)' }}>{c.taxNumber}</label><input className="input-field py-2 text-sm" value={form.taxNumber} onChange={e => setForm({ ...form, taxNumber: e.target.value })} /></div>
                                    <div><label className={lblCls} style={{ color: 'var(--text-muted)' }}>{c.commercialRegister}</label><input className="input-field py-2 text-sm" value={form.commercialRegister} onChange={e => setForm({ ...form, commercialRegister: e.target.value })} /></div>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 p-5 border-t sticky bottom-0 bg-white/80 dark:bg-surface-900/80 backdrop-blur-md" style={{ borderColor: 'var(--border-default)' }}>
                            <button onClick={() => setShowAddEdit(false)} className="btn-secondary">{dict.common.cancel}</button>
                            <button onClick={saveCustomer} disabled={saving} className="btn-primary shadow-lg shadow-primary-500/30 flex items-center gap-2 disabled:opacity-70">
                                {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"/> : null}
                                {saving ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : dict.common.save}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Other Modals */}
            {showDelete && <DeleteConfirmModal dict={dict} customerName={isRTL ? showDelete?.nameAr : showDelete?.name} onConfirm={deleteCustomer} onCancel={() => setShowDelete(null)} />}
            {showAccount && <ViewAccountModal dict={dict} locale={locale} customer={showAccount} onClose={() => setShowAccount(null)} formatCurrency={formatCurrency} />}
            {showGroups && <CustomerGroupsModal dict={dict} locale={locale} customers={customers} onClose={() => setShowGroups(false)} />}
            {showImport && <ImportCustomersModal dict={dict} locale={locale} onClose={() => setShowImport(false)} />}
        </div>
    );
}
