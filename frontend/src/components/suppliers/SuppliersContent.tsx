'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DeleteConfirmModal, ViewAccountModal, SupplierCategoriesModal, ImportSuppliersModal } from './SupplierModals';
import { crmApi } from '@/lib/api';

interface Supplier {
    id: string; name: string; nameAr: string; phone: string; email: string; address: string;
    category: string; paymentType: 'cash' | 'credit'; status: string;
    totalPurchases: number; balance: number; creditLimit: number; paymentTerms: number;
    lastOrder: string; orders: number; taxNumber?: string; commercialRegister?: string;
}

const initialSuppliers: Supplier[] = [
    { id: 'S-001', name: 'National Foods Co.', nameAr: 'شركة الأغذية الوطنية', phone: '0501234567', email: 'info@natfoods.sa', address: 'Riyadh', category: 'manufacturer', paymentType: 'credit', status: 'active', totalPurchases: 520000, balance: 35000, creditLimit: 100000, paymentTerms: 45, lastOrder: '2026-02-23', orders: 67 },
    { id: 'S-002', name: 'Gulf Imports', nameAr: 'واردات الخليج', phone: '0559876543', email: 'info@gulfimports.sa', address: 'Jeddah', category: 'importer', paymentType: 'credit', status: 'active', totalPurchases: 380000, balance: 22000, creditLimit: 80000, paymentTerms: 30, lastOrder: '2026-02-22', orders: 45 },
    { id: 'S-003', name: 'Al-Safi Dairy', nameAr: 'الصافي للألبان', phone: '0561112233', email: 'orders@alsafi.sa', address: 'Khobar', category: 'manufacturer', paymentType: 'credit', status: 'active', totalPurchases: 290000, balance: 0, creditLimit: 60000, paymentTerms: 30, lastOrder: '2026-02-21', orders: 38 },
    { id: 'S-004', name: 'Express Distribution', nameAr: 'إكسبرس للتوزيع', phone: '0504445566', email: 'sales@express.sa', address: 'Riyadh', category: 'distributor', paymentType: 'cash', status: 'active', totalPurchases: 175000, balance: 0, creditLimit: 0, paymentTerms: 0, lastOrder: '2026-02-20', orders: 29 },
    { id: 'S-005', name: 'Asia Trading', nameAr: 'آسيا للتجارة', phone: '0507778899', email: 'info@asiatrade.sa', address: 'Dammam', category: 'importer', paymentType: 'credit', status: 'active', totalPurchases: 210000, balance: 18000, creditLimit: 50000, paymentTerms: 60, lastOrder: '2026-02-19', orders: 24 },
    { id: 'S-006', name: 'Local Farm Supplies', nameAr: 'مستلزمات المزرعة المحلية', phone: '0533334455', email: 'farm@local.sa', address: 'Tabuk', category: 'local', paymentType: 'cash', status: 'active', totalPurchases: 95000, balance: 0, creditLimit: 0, paymentTerms: 0, lastOrder: '2026-02-18', orders: 18 },
    { id: 'S-007', name: 'Premium Packaging', nameAr: 'بريميوم للتغليف', phone: '0512223344', email: 'info@premium.sa', address: 'Madinah', category: 'manufacturer', paymentType: 'credit', status: 'inactive', totalPurchases: 67000, balance: 8500, creditLimit: 25000, paymentTerms: 30, lastOrder: '2026-01-15', orders: 11 },
    { id: 'S-008', name: 'Green Valley', nameAr: 'الوادي الأخضر', phone: '0545556677', email: 'green@valley.sa', address: 'Abha', category: 'local', paymentType: 'cash', status: 'active', totalPurchases: 43000, balance: 0, creditLimit: 0, paymentTerms: 0, lastOrder: '2026-02-17', orders: 9 },
];

interface Props { dict: any; locale: string; }

export default function SuppliersContent({ dict, locale }: Props) {
    const isRTL = locale === 'ar';
    const s = dict.suppliers;

    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [catFilter, setCatFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [paymentFilter, setPaymentFilter] = useState('all');

    const [showAddEdit, setShowAddEdit] = useState(false);
    const [showDelete, setShowDelete] = useState<Supplier | null>(null);
    const [showAccount, setShowAccount] = useState<Supplier | null>(null);
    const [showCategories, setShowCategories] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Fetch data
    const fetchSuppliers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await crmApi.getSuppliers();
            const apiSuppliers = res.data?.data?.data || res.data?.data || [];
            const formatted = apiSuppliers.map((s: any) => ({
                id: s.id?.toString() || s.supplier_code,
                name: s.name || '',
                nameAr: s.name_ar || s.name || '',
                phone: s.phone || '',
                email: s.email || '',
                address: s.address || '',
                category: s.category || 'local',
                paymentType: s.payment_type || 'cash',
                status: s.status || 'active',
                totalPurchases: Number(s.total_purchases || 0),
                balance: Number(s.balance || 0),
                creditLimit: Number(s.credit_limit || 0),
                paymentTerms: Number(s.payment_terms || 0),
                lastOrder: s.last_order || '-',
                orders: Number(s.orders_count || 0),
                taxNumber: s.tax_number || '',
                commercialRegister: s.commercial_register || ''
            }));
            setSuppliers(formatted);
        } catch (error) {
            console.error('Failed fetching suppliers:', error);
            showToast(isRTL ? 'فشل تحميل بيانات الموردين' : 'Failed to load suppliers', 'error');
        }
        setLoading(false);
    }, [isRTL]);

    useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

    const emptyForm = { name: '', nameAr: '', phone: '', email: '', address: '', category: 'local', paymentType: 'cash' as 'cash' | 'credit', creditLimit: 0, paymentTerms: 0, taxNumber: '', commercialRegister: '' };
    const [form, setForm] = useState(emptyForm);

    const formatCurrency = (v: number) => new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', { style: 'currency', currency: 'SAR', minimumFractionDigits: 0 }).format(v);
    const catLabel = (c: string) => ({ local: s.catLocal, importer: s.catImporter, manufacturer: s.catManufacturer, distributor: s.catDistributor }[c] || c);
    const catBadge = (c: string) => ({ local: 'badge-success', importer: 'badge-info', manufacturer: 'badge-warning', distributor: 'badge bg-surface-200/10 text-surface-200/60' }[c] || 'badge-info');

    const filtered = useMemo(() => suppliers.filter(su => {
        const name = isRTL ? su.nameAr : su.name;
        return (!search || name.toLowerCase().includes(search.toLowerCase()) || su.id.toLowerCase().includes(search.toLowerCase()) || su.phone.includes(search))
            && (catFilter === 'all' || su.category === catFilter)
            && (statusFilter === 'all' || su.status === statusFilter)
            && (paymentFilter === 'all' || su.paymentType === paymentFilter);
    }), [suppliers, search, catFilter, statusFilter, paymentFilter, isRTL]);

    const openAdd = () => { setEditingSupplier(null); setForm(emptyForm); setShowAddEdit(true); };
    const openEdit = (su: Supplier) => {
        setEditingSupplier(su);
        setForm({ name: su.name, nameAr: su.nameAr, phone: su.phone, email: su.email, address: su.address, category: su.category, paymentType: su.paymentType, creditLimit: su.creditLimit, paymentTerms: su.paymentTerms, taxNumber: su.taxNumber || '', commercialRegister: su.commercialRegister || '' });
        setShowAddEdit(true);
    };

    const saveSupplier = useCallback(async () => {
        if (!form.name && !form.nameAr) return;
        setSaving(true);
        const payload = {
            name: form.name || form.nameAr,
            name_ar: form.nameAr || form.name,
            phone: form.phone,
            email: form.email,
            address: form.address,
            category: form.category,
            payment_type: form.paymentType,
            credit_limit: form.paymentType === 'credit' ? form.creditLimit : 0,
            payment_terms: form.paymentType === 'credit' ? form.paymentTerms : 0,
            tax_number: form.taxNumber,
            commercial_register: form.commercialRegister,
        };
        try {
            if (editingSupplier) {
                await crmApi.updateSupplier(editingSupplier.id, payload);
                showToast(isRTL ? 'تم تحديث بيانات المورد بنجاح ✓' : 'Supplier updated successfully ✓');
            } else {
                await crmApi.createSupplier(payload);
                showToast(isRTL ? 'تم إضافة المورد بنجاح ✓' : 'Supplier added successfully ✓');
            }
            setShowAddEdit(false);
            fetchSuppliers();
        } catch (err: any) {
            showToast(err?.response?.data?.message || (isRTL ? 'فشل الحفظ' : 'Save failed'), 'error');
        } finally {
            setSaving(false);
        }
    }, [form, editingSupplier, isRTL, fetchSuppliers]);

    const deleteSupplier = useCallback(async () => {
        if (!showDelete) return;
        try {
            await crmApi.deleteSupplier(showDelete.id);
            showToast(isRTL ? 'تم حذف المورد بنجاح' : 'Supplier deleted', 'success');
            setShowDelete(null);
            fetchSuppliers();
        } catch (err: any) {
            showToast(err?.response?.data?.message || (isRTL ? 'فشل الحذف' : 'Delete failed'), 'error');
            setShowDelete(null);
        }
    }, [showDelete, isRTL, fetchSuppliers]);

    const exportCSV = useCallback(async () => {
        try {
            const { crmApi } = await import('@/lib/api');
            const blob = await crmApi.exportSuppliers();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'suppliers.xlsx'; a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Failed to export', e);
            alert(isRTL ? 'فشل التصدير' : 'Export failed');
        }
    }, [isRTL]);

    const handleAction = (key: string) => { switch (key) { case 'add': openAdd(); break; case 'import': setShowImport(true); break; case 'export': exportCSV(); break; case 'categories': setShowCategories(true); break; } };

    const totalPurchases = suppliers.reduce((a, b) => a + b.totalPurchases, 0);
    const outstanding = suppliers.reduce((a, b) => a + b.balance, 0);
    const stats = [
        { label: s.totalSuppliers, value: suppliers.length.toString(), change: '+8%', positive: true, icon: '🏭', gradient: 'from-blue-500/20 to-blue-600/5' },
        { label: s.newThisMonth, value: '2', change: '+20%', positive: true, icon: '🆕', gradient: 'from-green-500/20 to-green-600/5' },
        { label: s.totalPurchases, value: formatCurrency(totalPurchases), change: '+15%', positive: true, icon: '📦', gradient: 'from-purple-500/20 to-purple-600/5' },
        { label: s.outstandingBalance, value: formatCurrency(outstanding), change: '-3%', positive: false, icon: '⚖️', gradient: 'from-red-500/20 to-red-600/5' },
    ];

    const actionBtns = [
        { key: 'add', label: s.addSupplier, icon: '➕', gradient: 'from-green-500/15 to-emerald-600/5', border: 'border-green-500/20 hover:border-green-400/40' },
        { key: 'import', label: s.importSuppliers, icon: '📥', gradient: 'from-blue-500/15 to-cyan-600/5', border: 'border-blue-500/20 hover:border-blue-400/40' },
        { key: 'export', label: s.exportSuppliers, icon: '📤', gradient: 'from-purple-500/15 to-violet-600/5', border: 'border-purple-500/20 hover:border-purple-400/40' },
        { key: 'report', label: s.supplierReport, icon: '📊', gradient: 'from-yellow-500/15 to-amber-600/5', border: 'border-yellow-500/20 hover:border-yellow-400/40' },
        { key: 'categories', label: s.supplierCategories, icon: '🏷️', gradient: 'from-orange-500/15 to-red-600/5', border: 'border-orange-500/20 hover:border-orange-400/40' },
    ];

    const chartData = [...suppliers].sort((a, b) => b.totalPurchases - a.totalPurchases).slice(0, 5).map(su => ({ name: isRTL ? su.nameAr : su.name, value: su.totalPurchases }));
    const lblCls = "block text-xs font-medium mb-1.5 uppercase tracking-wider";

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-6 ${isRTL ? 'left-6' : 'right-6'} z-[200] px-5 py-3 rounded-2xl shadow-2xl text-white text-sm font-bold flex items-center gap-2 animate-scale-in ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                    {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
                </div>
            )}
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{s.title}</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{s.subtitle}</p>
                </div>
                <button onClick={openAdd} className="btn-primary flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    {s.addSupplier}
                </button>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {actionBtns.map(a => (
                    <button key={a.key} onClick={() => handleAction(a.key)} className={`relative overflow-hidden flex items-center gap-2.5 p-3.5 rounded-xl border ${a.border} transition-all duration-300 group cursor-pointer`} style={{ background: 'var(--bg-input)' }}>
                        <div className={`absolute inset-0 bg-gradient-to-br ${a.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                        <span className="relative text-lg group-hover:scale-110 transition-transform duration-300">{a.icon}</span>
                        <span className="relative text-xs font-medium leading-tight" style={{ color: 'var(--text-secondary)' }}>{a.label}</span>
                    </button>
                ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {stats.map((st, i) => (
                    <div key={i} className="stat-card relative overflow-hidden">
                        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${st.gradient} opacity-50`} />
                        <div className="relative flex items-start justify-between">
                            <div>
                                <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>{st.label}</p>
                                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{st.value}</p>
                                <p className={`text-xs mt-2 ${st.positive ? 'text-green-500' : 'text-red-500'}`}>{st.change} {isRTL ? 'مقارنة بالشهر الماضي' : 'vs last month'}</p>
                            </div>
                            <span className="text-3xl opacity-80">{st.icon}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Chart + Table */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="glass-card p-6">
                    <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>📊 {s.topSuppliers}</h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={chartData} layout="vertical" margin={{ left: isRTL ? 16 : 0, right: isRTL ? 40 : 16 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
                            <XAxis type="number" reversed={isRTL} orientation="bottom" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                            <YAxis dataKey="name" type="category" orientation={isRTL ? "right" : "left"} width={isRTL ? 140 : 90} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                            <Tooltip contentStyle={{ background: 'var(--bg-modal)', border: '1px solid var(--border-default)', borderRadius: '12px', color: 'var(--text-primary)' }} formatter={(value: number) => [formatCurrency(value), isRTL ? 'المشتريات' : 'Purchases']} />
                            <Bar dataKey="value" fill="#8b5cf6" radius={isRTL ? [6, 0, 0, 6] : [0, 6, 6, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="lg:col-span-2 glass-card p-6">
                    <div className="flex flex-wrap items-center gap-3 mb-5">
                        <h3 className="text-base font-semibold me-auto" style={{ color: 'var(--text-primary)' }}>🏭 {s.title}<span className="text-xs font-normal ms-2 px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-surface-secondary)', color: 'var(--text-muted)' }}>{filtered.length}</span></h3>
                        <div className="relative">
                            <svg className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <input className="input-field ps-10 py-2 text-sm w-52" placeholder={s.searchPlaceholder} value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                        <select className="select-field py-2 text-sm w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="all">{s.allStatuses}</option><option value="active">{s.active}</option><option value="inactive">{s.inactive}</option></select>
                        <select className="select-field py-2 text-sm w-auto" value={catFilter} onChange={e => setCatFilter(e.target.value)}><option value="all">{s.allCategories}</option><option value="local">{s.catLocal}</option><option value="importer">{s.catImporter}</option><option value="manufacturer">{s.catManufacturer}</option><option value="distributor">{s.catDistributor}</option></select>
                        <select className="select-field py-2 text-sm w-auto" value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)}><option value="all">{s.paymentType}</option><option value="cash">{s.cashSupplier}</option><option value="credit">{s.creditSupplier}</option></select>
                    </div>

                    {filtered.length === 0 ? (
                        <div className="text-center py-12"><span className="text-4xl mb-3 block">🔍</span><p style={{ color: 'var(--text-muted)' }}>{s.noSuppliers}</p></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="data-table text-sm">
                                <thead><tr><th>{s.code}</th><th>{s.supplierName}</th><th>{s.phone}</th><th>{s.category}</th><th>{s.paymentType}</th><th>{s.totalPurchases}</th><th>{s.balance}</th><th>{s.status}</th><th>{dict.common.actions}</th></tr></thead>
                                <tbody>
                                    {filtered.map(su => {
                                        const pct = su.creditLimit > 0 ? Math.round((su.balance / su.creditLimit) * 100) : 0;
                                        return (
                                            <tr key={su.id}>
                                                <td className="font-mono text-primary-400 font-medium">{su.id}</td>
                                                <td><div style={{ color: 'var(--text-primary)' }} className="font-medium">{isRTL ? su.nameAr : su.name}</div><div className="text-xs" style={{ color: 'var(--text-muted)' }}>{su.email}</div></td>
                                                <td style={{ color: 'var(--text-secondary)' }}>{su.phone}</td>
                                                <td><span className={`badge ${catBadge(su.category)}`}>{catLabel(su.category)}</span></td>
                                                <td><span className={`badge ${su.paymentType === 'credit' ? 'badge-info' : 'badge-success'}`}>{su.paymentType === 'credit' ? s.creditSupplier : s.cashSupplier}</span></td>
                                                <td style={{ color: 'var(--text-primary)' }} className="font-medium">{formatCurrency(su.totalPurchases)}</td>
                                                <td>{su.paymentType === 'credit' ? (<div><span className={`font-medium ${su.balance > 0 ? 'text-red-500' : 'text-green-500'}`}>{formatCurrency(su.balance)}</span>{su.creditLimit > 0 && (<div className="mt-1"><div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface-secondary)' }}><div className={`h-full rounded-full ${pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} /></div><span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{pct}%</span></div>)}</div>) : <span className="text-green-500">—</span>}</td>
                                                <td><span className={`inline-flex items-center gap-1.5 text-xs ${su.status === 'active' ? 'text-green-500' : 'text-red-400'}`}><span className={`w-1.5 h-1.5 rounded-full ${su.status === 'active' ? 'bg-green-500' : 'bg-red-400'}`} />{su.status === 'active' ? s.active : s.inactive}</span></td>
                                                <td>
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={() => setShowAccount(su)} className="btn-icon text-xs" style={{ color: 'var(--text-muted)' }}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg></button>
                                                        <button onClick={() => openEdit(su)} className="btn-icon text-xs" style={{ color: 'var(--text-muted)' }}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg></button>
                                                        <button onClick={() => setShowDelete(su)} className="btn-icon text-xs hover:!text-red-400" style={{ color: 'var(--text-muted)' }}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
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

            {/* Add/Edit Modal */}
            {showAddEdit && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAddEdit(false)}>
                    <div className="modal-content !max-w-2xl">
                        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-default)' }}>
                            <div className="flex items-center gap-2"><span className="text-xl">{editingSupplier ? '✏️' : '➕'}</span><h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{editingSupplier ? s.editSupplier : s.addSupplier}</h2></div>
                            <button onClick={() => setShowAddEdit(false)} className="btn-icon"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <div className="p-5 space-y-5">
                            <div><h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}><span className="w-1.5 h-1.5 rounded-full bg-primary-500" />{s.basicInfo}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div><label className={lblCls} style={{ color: 'var(--text-muted)' }}>{s.supplierName} (AR)</label><input className="input-field py-2 text-sm" value={form.nameAr} onChange={e => setForm({ ...form, nameAr: e.target.value })} /></div>
                                    <div><label className={lblCls} style={{ color: 'var(--text-muted)' }}>{s.supplierName} (EN)</label><input className="input-field py-2 text-sm" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} dir="ltr" /></div>
                                    <div><label className={lblCls} style={{ color: 'var(--text-muted)' }}>{s.phone}</label><input className="input-field py-2 text-sm" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                                    <div><label className={lblCls} style={{ color: 'var(--text-muted)' }}>{s.email}</label><input className="input-field py-2 text-sm" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                                    <div><label className={lblCls} style={{ color: 'var(--text-muted)' }}>{s.address}</label><input className="input-field py-2 text-sm" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
                                    <div><label className={lblCls} style={{ color: 'var(--text-muted)' }}>{s.category}</label><select className="select-field py-2 text-sm" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}><option value="local">{s.catLocal}</option><option value="importer">{s.catImporter}</option><option value="manufacturer">{s.catManufacturer}</option><option value="distributor">{s.catDistributor}</option></select></div>
                                    <div className="md:col-span-2"><label className={lblCls} style={{ color: 'var(--text-muted)' }}>{s.paymentType}</label><select className="select-field py-2 text-sm" value={form.paymentType} onChange={e => setForm({ ...form, paymentType: e.target.value as any })}><option value="cash">{s.cashSupplier}</option><option value="credit">{s.creditSupplier}</option></select></div>
                                </div>
                            </div>
                            {form.paymentType === 'credit' && (
                                <div><h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}><span className="w-1.5 h-1.5 rounded-full bg-blue-500" />{s.creditInfo}</h3>
                                    <div className="glass-card p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div><label className={lblCls} style={{ color: 'var(--text-muted)' }}>{s.creditLimit}</label><input type="number" className="input-field py-2 text-sm" min="0" value={form.creditLimit} onChange={e => setForm({ ...form, creditLimit: +e.target.value || 0 })} /></div>
                                        <div><label className={lblCls} style={{ color: 'var(--text-muted)' }}>{s.paymentTerms}</label><input type="number" className="input-field py-2 text-sm" min="0" value={form.paymentTerms} onChange={e => setForm({ ...form, paymentTerms: +e.target.value || 0 })} /></div>
                                    </div>
                                </div>
                            )}
                            <div><h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}><span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />{s.businessInfo}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div><label className={lblCls} style={{ color: 'var(--text-muted)' }}>{s.taxNumber}</label><input className="input-field py-2 text-sm" value={form.taxNumber} onChange={e => setForm({ ...form, taxNumber: e.target.value })} /></div>
                                    <div><label className={lblCls} style={{ color: 'var(--text-muted)' }}>{s.commercialRegister}</label><input className="input-field py-2 text-sm" value={form.commercialRegister} onChange={e => setForm({ ...form, commercialRegister: e.target.value })} /></div>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 p-5 border-t" style={{ borderColor: 'var(--border-default)' }}>
                            <button onClick={() => setShowAddEdit(false)} className="btn-secondary">{dict.common.cancel}</button>
                            <button onClick={saveSupplier} className="btn-primary">{dict.common.save}</button>
                        </div>
                    </div>
                </div>
            )}

            {showDelete && <DeleteConfirmModal dict={dict} supplierName={isRTL ? showDelete.nameAr : showDelete.name} onConfirm={deleteSupplier} onCancel={() => setShowDelete(null)} />}
            {showAccount && <ViewAccountModal dict={dict} locale={locale} supplier={showAccount} onClose={() => setShowAccount(null)} formatCurrency={formatCurrency} />}
            {showCategories && <SupplierCategoriesModal dict={dict} locale={locale} suppliers={suppliers} onClose={() => setShowCategories(false)} />}
            {showImport && <ImportSuppliersModal dict={dict} locale={locale} onClose={() => setShowImport(false)} />}
        </div>
    );
}
