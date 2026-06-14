'use client';

import { useState, useMemo } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';

// ── Mock Data ──────────────────────────────────────────────────────
const returnRecords = [
    { id: 'RET-001', type: 'salesReturn' as const, invoice: 'INV-000005', customer: 'Star Electronics', customerAr: 'ستار للإلكترونيات', product: 'Samsung TV 55"', productAr: 'شاشة سامسونج 55', qty: 2, amount: 3198, reason: 'defective', condition: 'needsRepair', compensation: 'cashRefund', status: 'completed' as const, date: '2026-02-23', processedBy: 'Admin' },
    { id: 'RET-002', type: 'salesReturn' as const, invoice: 'INV-000009', customer: 'Premium Parts', customerAr: 'قطع بريميوم', product: 'USB-C Cable 2m', productAr: 'كابل USB-C 2م', qty: 5, amount: 175, reason: 'wrongItem', condition: 'resellable', compensation: 'exchange', status: 'completed' as const, date: '2026-02-22', processedBy: 'Admin' },
    { id: 'RET-003', type: 'damage' as const, invoice: '-', customer: '-', customerAr: '-', product: 'HP LaserJet Printer', productAr: 'طابعة اتش بي ليزر', qty: 1, amount: 620, reason: 'damaged', condition: 'totallyDamaged', compensation: '-', status: 'completed' as const, date: '2026-02-21', processedBy: 'Warehouse' },
    { id: 'RET-004', type: 'purchaseReturn' as const, invoice: 'PO-000012', customer: 'Al-Noor Supplies', customerAr: 'مستلزمات النور', product: 'A4 Paper Bundle', productAr: 'رزمة ورق A4', qty: 50, amount: 1400, reason: 'damaged', condition: 'totallyDamaged', compensation: 'cashRefund', status: 'approved' as const, date: '2026-02-21', processedBy: 'Admin' },
    { id: 'RET-005', type: 'salesReturn' as const, invoice: 'INV-000003', customer: 'Al-Noor Supplies', customerAr: 'مستلزمات النور', product: 'Ink Cartridge', productAr: 'حبر طابعة', qty: 3, amount: 255, reason: 'expired', condition: 'totallyDamaged', compensation: 'storeCredit', status: 'completed' as const, date: '2026-02-20', processedBy: 'Admin' },
    { id: 'RET-006', type: 'damage' as const, invoice: '-', customer: '-', customerAr: '-', product: 'Office Chair', productAr: 'كرسي مكتب مريح', qty: 2, amount: 900, reason: 'damaged', condition: 'totallyDamaged', compensation: '-', status: 'completed' as const, date: '2026-02-19', processedBy: 'Warehouse' },
    { id: 'RET-007', type: 'salesReturn' as const, invoice: 'INV-000007', customer: 'Tech Hub', customerAr: 'تك هب', product: 'Network Switch', productAr: 'سويتش شبكة', qty: 1, amount: 3200, reason: 'defective', condition: 'needsRepair', compensation: 'exchange', status: 'pending' as const, date: '2026-02-23', processedBy: '-' },
    { id: 'RET-008', type: 'stockAdjustment' as const, invoice: '-', customer: '-', customerAr: '-', product: 'HDMI Cable', productAr: 'كابل HDMI', qty: 8, amount: 360, reason: 'otherReason', condition: 'resellable', compensation: '-', status: 'completed' as const, date: '2026-02-18', processedBy: 'Admin' },
];

const reasonsData = [
    { name: 'Defective', nameAr: 'معيب', value: 35, color: '#ef4444' },
    { name: 'Damaged', nameAr: 'تالف', value: 28, color: '#f97316' },
    { name: 'Wrong Item', nameAr: 'خاطئ', value: 18, color: '#eab308' },
    { name: 'Expired', nameAr: 'منتهي', value: 12, color: '#8b5cf6' },
    { name: 'Customer Request', nameAr: 'طلب عميل', value: 7, color: '#6366f1' },
];

const monthlyReturns = [
    { month: 'Sep', returns: 12, damages: 3 },
    { month: 'Oct', returns: 18, damages: 5 },
    { month: 'Nov', returns: 15, damages: 4 },
    { month: 'Dec', returns: 22, damages: 7 },
    { month: 'Jan', returns: 19, damages: 6 },
    { month: 'Feb', returns: 14, damages: 4 },
];

const topReturned = [
    { name: 'Samsung TV 55"', nameAr: 'شاشة سامسونج 55', returnCount: 12, amount: 19188 },
    { name: 'USB-C Cable 2m', nameAr: 'كابل USB-C 2م', returnCount: 8, amount: 280 },
    { name: 'HP LaserJet Printer', nameAr: 'طابعة اتش بي ليزر', returnCount: 5, amount: 3100 },
    { name: 'Ink Cartridge', nameAr: 'حبر طابعة', returnCount: 4, amount: 340 },
    { name: 'Office Chair', nameAr: 'كرسي مكتب مريح', returnCount: 3, amount: 1350 },
];

// ── Types ──
interface Props { dict: any; locale: string; }

// ── Component ──
export default function ReturnsContent({ dict, locale }: Props) {
    const isRTL = locale === 'ar';
    const r = dict.returns;

    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [reasonFilter, setReasonFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
    const [showCreateReturn, setShowCreateReturn] = useState(false);
    const [showCreateDamage, setShowCreateDamage] = useState(false);
    const [showDetail, setShowDetail] = useState<typeof returnRecords[0] | null>(null);

    // Form state
    const [newReturn, setNewReturn] = useState({ type: 'salesReturn', invoice: '', customer: '', product: '', qty: 1, unitPrice: 0, reason: 'defective', condition: 'resellable', compensation: 'cashRefund', notes: '' });

    const formatCurrency = (val: number) => new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', { style: 'currency', currency: 'SAR', minimumFractionDigits: 0 }).format(val);

    // ── Filtered records ──
    const filteredRecords = useMemo(() => {
        return returnRecords.filter(rec => {
            const matchSearch = !search || rec.id.toLowerCase().includes(search.toLowerCase()) || rec.product.toLowerCase().includes(search.toLowerCase()) || rec.productAr.includes(search) || rec.customer.toLowerCase().includes(search.toLowerCase()) || rec.customerAr.includes(search);
            const matchType = typeFilter === 'all' || rec.type === typeFilter;
            const matchStatus = statusFilter === 'all' || rec.status === statusFilter;
            const matchReason = reasonFilter === 'all' || rec.reason === reasonFilter;
            const matchDateFrom = !dateFrom || rec.date >= dateFrom;
            const matchDateTo = !dateTo || rec.date <= dateTo;
            return matchSearch && matchType && matchStatus && matchReason && matchDateFrom && matchDateTo;
        });
    }, [search, typeFilter, statusFilter, reasonFilter, dateFrom, dateTo]);

    // ── Export CSV ──
    const exportCSV = () => {
        const headers = ['ID', 'Type', 'Invoice', 'Customer', 'Product', 'Qty', 'Amount', 'Reason', 'Status', 'Date'];
        const rows = filteredRecords.map(r => [r.id, r.type, r.invoice, r.customer, r.product, r.qty, r.amount, r.reason, r.status, r.date]);
        const csv = '\uFEFF' + [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'returns.csv'; a.click(); URL.revokeObjectURL(url);
    };

    // ── Stats ──
    const totalReturnValue = returnRecords.filter(r => r.type === 'salesReturn' || r.type === 'purchaseReturn').reduce((s, r) => s + r.amount, 0);
    const damageValue = returnRecords.filter(r => r.type === 'damage').reduce((s, r) => s + r.amount, 0);
    const pendingCount = returnRecords.filter(r => r.status === 'pending').length;

    const stats = [
        { label: r.totalReturns, value: returnRecords.filter(r => r.type !== 'damage' && r.type !== 'stockAdjustment').length.toString(), sub: formatCurrency(totalReturnValue), icon: '🔄', color: 'from-blue-500/20 to-blue-600/5', accent: 'text-blue-400' },
        { label: r.todayReturns, value: returnRecords.filter(r => r.date === '2026-02-23').length.toString(), sub: isRTL ? 'اليوم' : 'Today', icon: '📋', color: 'from-cyan-500/20 to-cyan-600/5', accent: 'text-cyan-400' },
        { label: r.totalDamages, value: returnRecords.filter(r => r.type === 'damage').length.toString(), sub: formatCurrency(damageValue), icon: '💔', color: 'from-red-500/20 to-red-600/5', accent: 'text-red-400' },
        { label: r.returnRate, value: '3.2%', sub: isRTL ? 'من المبيعات' : 'of sales', icon: '📊', color: 'from-yellow-500/20 to-yellow-600/5', accent: 'text-yellow-400' },
        { label: r.totalLosses, value: formatCurrency(damageValue), sub: isRTL ? 'هذا الشهر' : 'This month', icon: '⚠️', color: 'from-orange-500/20 to-orange-600/5', accent: 'text-orange-400' },
    ];

    const statusBadge = (s: string) => ({ completed: 'badge-success', approved: 'badge-info', pending: 'badge-warning', rejected: 'badge-danger' }[s] || 'badge-info');
    const typeBadge = (t: string) => ({ salesReturn: 'badge-info', purchaseReturn: 'badge-warning', damage: 'badge-danger', stockAdjustment: 'badge-success' }[t] || 'badge-info');

    const tooltipStyle = { backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' };

    // ── Quick Action Buttons ──
    const actionButtons = [
        { key: 'createReturn', label: r.createReturn, icon: '🔄', gradient: 'from-blue-500/15 to-cyan-600/5', border: 'border-blue-500/20 hover:border-blue-400/40' },
        { key: 'createDamage', label: r.createDamage, icon: '💔', gradient: 'from-red-500/15 to-rose-600/5', border: 'border-red-500/20 hover:border-red-400/40' },
        { key: 'salesReturn', label: r.salesReturn, icon: '↩️', gradient: 'from-green-500/15 to-emerald-600/5', border: 'border-green-500/20 hover:border-green-400/40' },
        { key: 'purchaseReturn', label: r.purchaseReturn, icon: '📦', gradient: 'from-yellow-500/15 to-amber-600/5', border: 'border-yellow-500/20 hover:border-yellow-400/40' },
    ];

    const handleAction = (key: string) => {
        if (key === 'createReturn') setShowCreateReturn(true);
        else if (key === 'createDamage') setShowCreateDamage(true);
        else if (key === 'salesReturn') { setTypeFilter('salesReturn'); }
        else if (key === 'purchaseReturn') { setTypeFilter('purchaseReturn'); }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{r.title}</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{r.subtitle}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={exportCSV} className="btn-secondary flex items-center gap-2 text-sm">📤 {r.exportRecords}</button>
                    <button onClick={() => setShowCreateReturn(true)} className="btn-primary flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                        {r.createReturn}
                    </button>
                </div>
            </div>

            {/* ── Quick Action Buttons ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {actionButtons.map(action => (
                    <button key={action.key} onClick={() => handleAction(action.key)} className={`relative overflow-hidden flex items-center gap-2.5 p-3.5 rounded-xl border ${action.border} bg-surface-800/40 hover:bg-surface-800/70 transition-all duration-300 group cursor-pointer`}>
                        <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                        <span className="relative text-lg group-hover:scale-110 transition-transform duration-300">{action.icon}</span>
                        <span className="relative text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{action.label}</span>
                    </button>
                ))}
            </div>

            {/* ── Alert Banner ── */}
            {pendingCount > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(234, 179, 8, 0.06)', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                    <span className="text-lg">⏳</span>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {pendingCount} {isRTL ? 'مرتجعات قيد المراجعة تحتاج موافقة' : 'pending returns need approval'}
                    </p>
                    <button onClick={() => setStatusFilter('pending')} className="ms-auto text-xs font-semibold text-yellow-400 hover:text-yellow-300">{isRTL ? 'عرض' : 'View'}</button>
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {stats.map((stat, i) => (
                    <div key={i} className="stat-card" style={{ animationDelay: `${i * 80}ms` }}>
                        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${stat.color} opacity-50`} />
                        <div className="relative flex items-start justify-between">
                            <div>
                                <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{stat.label}</p>
                                <p className={`text-xl font-bold ${stat.accent}`}>{stat.value}</p>
                            </div>
                            <span className="text-2xl opacity-80">{stat.icon}</span>
                        </div>
                        <p className="relative text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{stat.sub}</p>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Monthly Trend */}
                <div className="lg:col-span-2 glass-card p-5">
                    <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>📈 {r.monthlyTrend}</h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={monthlyReturns}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="month" stroke="rgba(255,255,255,0.2)" fontSize={12} />
                            <YAxis stroke="rgba(255,255,255,0.2)" fontSize={12} />
                            <Tooltip contentStyle={tooltipStyle} />
                            <Bar dataKey="returns" fill="#6366f1" radius={[4, 4, 0, 0]} name={isRTL ? 'مرتجعات' : 'Returns'} />
                            <Bar dataKey="damages" fill="#ef4444" radius={[4, 4, 0, 0]} name={isRTL ? 'تلفيات' : 'Damages'} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Reasons Pie */}
                <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>📊 {r.returnReasons}</h3>
                    <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                            <Pie data={reasonsData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={4} dataKey="value">
                                {reasonsData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                            </Pie>
                            <Tooltip contentStyle={tooltipStyle} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1.5 mt-2">
                        {reasonsData.map((item, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                    <span style={{ color: 'var(--text-secondary)' }}>{isRTL ? item.nameAr : item.name}</span>
                                </div>
                                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{item.value}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Top Returned Products */}
            <div className="glass-card p-5">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>⚠️ {r.topReturned}</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    {topReturned.map((p, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--bg-surface-secondary)' }}>
                            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-red-500/20 text-red-400' : i === 1 ? 'bg-orange-500/20 text-orange-400' : 'bg-yellow-500/10 text-yellow-400'}`}>{i + 1}</span>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{isRTL ? p.nameAr : p.name}</p>
                                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{p.returnCount}x • {formatCurrency(p.amount)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Records Table */}
            <div className="glass-card p-5">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-5">
                    <h3 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        {r.returnRecords}
                        <span className="text-xs font-normal px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-surface-secondary)', color: 'var(--text-muted)' }}>{filteredRecords.length}</span>
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                        {/* View toggle */}
                        <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
                            <button onClick={() => setViewMode('table')} className={`px-2.5 py-1.5 text-xs ${viewMode === 'table' ? 'bg-primary-600 text-white' : ''}`} style={viewMode !== 'table' ? { color: 'var(--text-muted)', background: 'var(--bg-input)' } : {}}>📊</button>
                            <button onClick={() => setViewMode('card')} className={`px-2.5 py-1.5 text-xs ${viewMode === 'card' ? 'bg-primary-600 text-white' : ''}`} style={viewMode !== 'card' ? { color: 'var(--text-muted)', background: 'var(--bg-input)' } : {}}>📝</button>
                        </div>
                        {/* Search */}
                        <div className="relative">
                            <svg className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <input type="text" placeholder={dict.common.search} value={search} onChange={e => setSearch(e.target.value)} className="input-field ps-10 w-48 py-2 text-sm" />
                        </div>
                        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="select-field w-auto py-2 text-sm">
                            <option value="all">{r.allTypes}</option>
                            <option value="salesReturn">{r.salesReturn}</option>
                            <option value="purchaseReturn">{r.purchaseReturn}</option>
                            <option value="damage">{r.damage}</option>
                            <option value="stockAdjustment">{r.stockAdjustment}</option>
                        </select>
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="select-field w-auto py-2 text-sm">
                            <option value="all">{isRTL ? 'جميع الحالات' : 'All Statuses'}</option>
                            <option value="pending">{r.pending}</option>
                            <option value="approved">{r.approved}</option>
                            <option value="completed">{r.completed}</option>
                            <option value="rejected">{r.rejected}</option>
                        </select>
                        <input type="date" className="input-field py-2 text-sm w-auto" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                        <input type="date" className="input-field py-2 text-sm w-auto" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                        {(typeFilter !== 'all' || statusFilter !== 'all' || search || dateFrom || dateTo || reasonFilter !== 'all') && (
                            <button onClick={() => { setTypeFilter('all'); setStatusFilter('all'); setSearch(''); setDateFrom(''); setDateTo(''); setReasonFilter('all'); }} className="btn-icon text-red-400 hover:text-red-300">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        )}
                    </div>
                </div>

                {/* Table / Card */}
                {filteredRecords.length === 0 ? (
                    <div className="text-center py-12">
                        <span className="text-4xl mb-3 block">📭</span>
                        <p style={{ color: 'var(--text-muted)' }}>{r.noRecords}</p>
                    </div>
                ) : viewMode === 'table' ? (
                    <>
                        <div className="overflow-x-auto">
                            <table className="data-table text-sm">
                                <thead><tr><th>#</th><th>{r.returnType}</th><th>{r.linkedInvoice}</th><th>{dict.sales?.product || 'Product'}</th><th>{dict.sales?.quantity || 'Qty'}</th><th>{r.refundAmount}</th><th>{r.returnReason}</th><th>{dict.common.status}</th><th>{dict.common.date}</th><th>{dict.common.actions}</th></tr></thead>
                                <tbody>
                                    {filteredRecords.map((rec, i) => (
                                        <tr key={i}>
                                            <td className="text-primary-400 font-mono font-medium">{rec.id}</td>
                                            <td><span className={`badge ${typeBadge(rec.type)} text-[10px]`}>{(r as any)[rec.type]}</span></td>
                                            <td className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{rec.invoice}</td>
                                            <td style={{ color: 'var(--text-primary)' }}>{isRTL ? rec.productAr : rec.product}</td>
                                            <td className="text-center" style={{ color: 'var(--text-secondary)' }}>{rec.qty}</td>
                                            <td className="font-medium text-red-400">{formatCurrency(rec.amount)}</td>
                                            <td><span className="text-xs" style={{ color: 'var(--text-muted)' }}>{(r as any)[rec.reason]}</span></td>
                                            <td><span className={`badge ${statusBadge(rec.status)} text-[10px]`}>{(r as any)[rec.status]}</span></td>
                                            <td style={{ color: 'var(--text-muted)' }}>{rec.date}</td>
                                            <td>
                                                <button onClick={() => setShowDetail(rec)} className="btn-icon" title={isRTL ? 'عرض' : 'View'}>
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>{r.showing} {filteredRecords.length} {r.of} {returnRecords.length} {r.records}</div>
                    </>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredRecords.map((rec, i) => {
                            const typeColors: Record<string, string> = { salesReturn: 'border-blue-500/30', purchaseReturn: 'border-yellow-500/30', damage: 'border-red-500/30', stockAdjustment: 'border-green-500/30' };
                            const statusDot: Record<string, string> = { completed: 'bg-green-500', approved: 'bg-blue-500', pending: 'bg-yellow-500', rejected: 'bg-red-500' };
                            return (
                                <div key={i} className={`glass-card p-4 relative cursor-pointer hover:scale-[1.02] transition-all border-s-4 ${typeColors[rec.type] || ''}`} onClick={() => setShowDetail(rec)}>
                                    <div className={`absolute top-3 end-3 w-2.5 h-2.5 rounded-full ${statusDot[rec.status] || 'bg-gray-500'}`} />
                                    <p className="text-xs font-mono font-bold text-primary-400 mb-1">{rec.id}</p>
                                    <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{isRTL ? rec.productAr : rec.product}</p>
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                        <span className={`badge ${typeBadge(rec.type)} text-[10px]`}>{(r as any)[rec.type]}</span>
                                        <span className={`badge ${statusBadge(rec.status)} text-[10px]`}>{(r as any)[rec.status]}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs pt-2" style={{ borderTop: '1px solid var(--border-default)' }}>
                                        <span className="font-bold text-red-400">{formatCurrency(rec.amount)}</span>
                                        <span style={{ color: 'var(--text-muted)' }}>{rec.date}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ═══ MODALS ═══ */}

            {/* ── Create Return Modal ── */}
            {showCreateReturn && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCreateReturn(false)}>
                    <div className="modal-content !max-w-2xl">
                        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-default)' }}>
                            <div className="flex items-center gap-2"><span className="text-xl">🔄</span><h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{r.createReturn}</h2></div>
                            <button onClick={() => setShowCreateReturn(false)} className="btn-icon"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{r.returnType}</label>
                                    <select className="select-field" value={newReturn.type} onChange={e => setNewReturn({ ...newReturn, type: e.target.value })}>
                                        <option value="salesReturn">{r.salesReturn}</option>
                                        <option value="purchaseReturn">{r.purchaseReturn}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{r.linkedInvoice}</label>
                                    <select className="select-field" value={newReturn.invoice} onChange={e => setNewReturn({ ...newReturn, invoice: e.target.value })}>
                                        <option value="">{r.selectInvoice}</option>
                                        <option value="INV-000001">INV-000001</option>
                                        <option value="INV-000002">INV-000002</option>
                                        <option value="INV-000003">INV-000003</option>
                                        <option value="INV-000005">INV-000005</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{isRTL ? 'المنتج' : 'Product'}</label>
                                    <input type="text" className="input-field" value={newReturn.product} onChange={e => setNewReturn({ ...newReturn, product: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{isRTL ? 'العميل / المورد' : 'Customer / Supplier'}</label>
                                    <input type="text" className="input-field" value={newReturn.customer} onChange={e => setNewReturn({ ...newReturn, customer: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{isRTL ? 'الكمية' : 'Quantity'}</label>
                                    <input type="number" className="input-field" min="1" value={newReturn.qty} onChange={e => setNewReturn({ ...newReturn, qty: parseInt(e.target.value) || 1 })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{isRTL ? 'سعر الوحدة' : 'Unit Price'}</label>
                                    <input type="number" className="input-field" min="0" step="0.01" value={newReturn.unitPrice} onChange={e => setNewReturn({ ...newReturn, unitPrice: parseFloat(e.target.value) || 0 })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{r.returnReason}</label>
                                    <select className="select-field" value={newReturn.reason} onChange={e => setNewReturn({ ...newReturn, reason: e.target.value })}>
                                        <option value="defective">{r.defective}</option>
                                        <option value="wrongItem">{r.wrongItem}</option>
                                        <option value="damaged">{r.damaged}</option>
                                        <option value="expired">{r.expired}</option>
                                        <option value="customerRequest">{r.customerRequest}</option>
                                        <option value="otherReason">{r.otherReason}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{r.productCondition}</label>
                                    <select className="select-field" value={newReturn.condition} onChange={e => setNewReturn({ ...newReturn, condition: e.target.value })}>
                                        <option value="resellable">{r.resellable}</option>
                                        <option value="needsRepair">{r.needsRepair}</option>
                                        <option value="totallyDamaged">{r.totallyDamaged}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{r.compensation}</label>
                                    <select className="select-field" value={newReturn.compensation} onChange={e => setNewReturn({ ...newReturn, compensation: e.target.value })}>
                                        <option value="cashRefund">{r.cashRefund}</option>
                                        <option value="storeCredit">{r.storeCredit}</option>
                                        <option value="exchange">{r.exchange}</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{isRTL ? 'ملاحظات' : 'Notes'}</label>
                                <textarea className="input-field" rows={2} value={newReturn.notes} onChange={e => setNewReturn({ ...newReturn, notes: e.target.value })} />
                            </div>
                            {/* Summary */}
                            <div className="glass-card p-4 space-y-2">
                                <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-muted)' }}>{isRTL ? 'المجموع' : 'Subtotal'}</span><span style={{ color: 'var(--text-primary)' }}>{formatCurrency(newReturn.qty * newReturn.unitPrice)}</span></div>
                                <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-muted)' }}>{isRTL ? 'الضريبة 15%' : 'VAT 15%'}</span><span style={{ color: 'var(--text-secondary)' }}>{formatCurrency(newReturn.qty * newReturn.unitPrice * 0.15)}</span></div>
                                <div className="flex justify-between text-base font-bold pt-2" style={{ borderTop: '1px solid var(--border-default)' }}><span style={{ color: 'var(--text-primary)' }}>{r.refundAmount}</span><span className="text-red-400">{formatCurrency(newReturn.qty * newReturn.unitPrice * 1.15)}</span></div>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 p-5 border-t" style={{ borderColor: 'var(--border-default)' }}>
                            <button onClick={() => setShowCreateReturn(false)} className="btn-secondary">{dict.common.cancel}</button>
                            <button className="btn-primary flex items-center gap-2">🔄 {dict.common.save}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Create Damage Modal ── */}
            {showCreateDamage && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCreateDamage(false)}>
                    <div className="modal-content max-w-lg">
                        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-default)' }}>
                            <div className="flex items-center gap-2"><span className="text-xl">💔</span><h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{r.createDamage}</h2></div>
                            <button onClick={() => setShowCreateDamage(false)} className="btn-icon"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{isRTL ? 'المنتج' : 'Product'}</label>
                                <input type="text" className="input-field" placeholder={isRTL ? 'اسم المنتج أو الباركود' : 'Product name or barcode'} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{isRTL ? 'الكمية' : 'Quantity'}</label>
                                    <input type="number" className="input-field" min="1" defaultValue={1} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{isRTL ? 'قيمة الوحدة' : 'Unit Value'}</label>
                                    <input type="number" className="input-field" min="0" step="0.01" defaultValue={0} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{r.returnReason}</label>
                                <select className="select-field">
                                    <option value="damaged">{r.damaged}</option>
                                    <option value="expired">{r.expired}</option>
                                    <option value="otherReason">{r.otherReason}</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{isRTL ? 'ملاحظات' : 'Notes'}</label>
                                <textarea className="input-field" rows={2} placeholder={isRTL ? 'وصف التلف...' : 'Describe the damage...'} />
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 p-5 border-t" style={{ borderColor: 'var(--border-default)' }}>
                            <button onClick={() => setShowCreateDamage(false)} className="btn-secondary">{dict.common.cancel}</button>
                            <button className="btn-danger flex items-center gap-2">💔 {dict.common.save}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Detail Modal ── */}
            {showDetail && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowDetail(null)}>
                    <div className="modal-content !max-w-xl">
                        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-default)' }}>
                            <div className="flex items-center gap-2"><span className="text-xl">📋</span><h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{isRTL ? 'تفاصيل المرتجع' : 'Return Details'}</h2></div>
                            <button onClick={() => setShowDetail(null)} className="btn-icon"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="glass-card p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                                <div><p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>#</p><p className="text-sm font-mono font-bold text-primary-400">{showDetail.id}</p></div>
                                <div><p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>{r.returnType}</p><span className={`badge ${typeBadge(showDetail.type)} text-[10px]`}>{(r as any)[showDetail.type]}</span></div>
                                <div><p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>{dict.common.status}</p><span className={`badge ${statusBadge(showDetail.status)} text-[10px]`}>{(r as any)[showDetail.status]}</span></div>
                            </div>
                            <div className="glass-card p-4 space-y-3">
                                <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-muted)' }}>{isRTL ? 'المنتج' : 'Product'}</span><span style={{ color: 'var(--text-primary)' }} className="font-medium">{isRTL ? showDetail.productAr : showDetail.product}</span></div>
                                {showDetail.customer !== '-' && <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-muted)' }}>{isRTL ? 'العميل/المورد' : 'Customer/Supplier'}</span><span style={{ color: 'var(--text-primary)' }}>{isRTL ? showDetail.customerAr : showDetail.customer}</span></div>}
                                <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-muted)' }}>{r.linkedInvoice}</span><span className="font-mono text-primary-400">{showDetail.invoice}</span></div>
                                <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-muted)' }}>{isRTL ? 'الكمية' : 'Qty'}</span><span style={{ color: 'var(--text-primary)' }}>{showDetail.qty}</span></div>
                                <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-muted)' }}>{r.refundAmount}</span><span className="text-red-400 font-bold">{formatCurrency(showDetail.amount)}</span></div>
                                <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-muted)' }}>{r.returnReason}</span><span style={{ color: 'var(--text-secondary)' }}>{(r as any)[showDetail.reason]}</span></div>
                                <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-muted)' }}>{r.productCondition}</span><span style={{ color: 'var(--text-secondary)' }}>{(r as any)[showDetail.condition]}</span></div>
                                {showDetail.compensation !== '-' && <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-muted)' }}>{r.compensation}</span><span style={{ color: 'var(--text-secondary)' }}>{(r as any)[showDetail.compensation]}</span></div>}
                                <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-muted)' }}>{r.returnDate}</span><span style={{ color: 'var(--text-secondary)' }}>{showDetail.date}</span></div>
                                <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-muted)' }}>{r.processedBy}</span><span style={{ color: 'var(--text-secondary)' }}>{showDetail.processedBy}</span></div>
                            </div>
                            {/* Workflow */}
                            <div className="glass-card p-4">
                                <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>{isRTL ? 'سير العمل' : 'Workflow'}</p>
                                <div className="flex items-center gap-2 text-xs">
                                    {['pending', 'approved', 'completed'].map((step, i) => (
                                        <div key={step} className="flex items-center gap-2">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${showDetail.status === step || (['approved', 'completed'].indexOf(showDetail.status) >= i) ? 'bg-green-500/20 text-green-400' : ''}`} style={!(['approved', 'completed'].indexOf(showDetail.status) >= i) && showDetail.status !== step ? { background: 'var(--bg-surface-secondary)', color: 'var(--text-muted)' } : {}}>
                                                {['approved', 'completed'].indexOf(showDetail.status) >= i ? '✓' : i + 1}
                                            </div>
                                            <span style={{ color: 'var(--text-muted)' }}>{(r as any)[step]}</span>
                                            {i < 2 && <div className="w-8 h-0.5 rounded-full" style={{ background: ['approved', 'completed'].indexOf(showDetail.status) > i ? '#22c55e' : 'var(--bg-surface-secondary)' }} />}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 p-5 border-t" style={{ borderColor: 'var(--border-default)' }}>
                            <button onClick={() => setShowDetail(null)} className="btn-secondary">{dict.common.cancel}</button>
                            <button className="btn-primary flex items-center gap-2">🖨️ {isRTL ? 'طباعة' : 'Print'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
