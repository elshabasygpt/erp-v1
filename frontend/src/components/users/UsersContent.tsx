'use client';

import { useState, useMemo } from 'react';
import { exportTableToPDF } from '@/lib/pdf-export';

type Role = 'admin' | 'accountant' | 'cashier' | 'warehouse';
type Status = 'active' | 'inactive';

interface User {
    id: string;
    name: string;
    nameAr: string;
    email: string;
    phone: string;
    role: Role;
    status: Status;
    lastLogin: string;
    createdAt: string;
    branch: string;
}

const ROLES: Record<Role, { ar: string; en: string; color: string; bg: string; icon: string; permissions: string[] }> = {
    admin: { ar: 'مدير', en: 'Admin', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: '👑', permissions: ['كل الصلاحيات'] },
    accountant: { ar: 'محاسب', en: 'Accountant', color: '#6366f1', bg: 'rgba(99,102,241,0.12)', icon: '📊', permissions: ['فواتير', 'تقارير', 'مدفوعات', 'ضريبة'] },
    cashier: { ar: 'كاشير', en: 'Cashier', color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: '💳', permissions: ['نقطة البيع', 'فواتير البيع', 'إيصالات'] },
    warehouse: { ar: 'مخزن', en: 'Warehouse', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: '📦', permissions: ['المخزون', 'حركات المواد', 'الموردين'] },
};

const INITIAL_USERS: User[] = [
    { id: 'USR-001', name: 'Ahmed Al-Rashid', nameAr: 'أحمد الراشد', email: 'admin@company.sa', phone: '0501234567', role: 'admin', status: 'active', lastLogin: '2026-03-01 14:30', createdAt: '2025-01-01', branch: 'الرياض' },
    { id: 'USR-002', name: 'Sara Al-Qahtani', nameAr: 'سارة القحطاني', email: 'sara@company.sa', phone: '0559876543', role: 'accountant', status: 'active', lastLogin: '2026-03-01 09:15', createdAt: '2025-03-15', branch: 'الرياض' },
    { id: 'USR-003', name: 'Ali Hassan', nameAr: 'علي حسن', email: 'ali@company.sa', phone: '0561112233', role: 'cashier', status: 'active', lastLogin: '2026-03-01 16:45', createdAt: '2025-06-01', branch: 'جدة' },
    { id: 'USR-004', name: 'Reem Al-Otaibi', nameAr: 'ريم العتيبي', email: 'reem@company.sa', phone: '0504445566', role: 'cashier', status: 'active', lastLogin: '2026-02-28 11:20', createdAt: '2025-06-01', branch: 'الرياض' },
    { id: 'USR-005', name: 'Fahad Al-Dossari', nameAr: 'فهد الدوسري', email: 'fahad@company.sa', phone: '0507778899', role: 'warehouse', status: 'active', lastLogin: '2026-03-01 08:00', createdAt: '2025-08-10', branch: 'الدمام' },
    { id: 'USR-006', name: 'Nora Al-Shahri', nameAr: 'نورة الشهري', email: 'nora@company.sa', phone: '0533334455', role: 'accountant', status: 'inactive', lastLogin: '2026-01-15 13:00', createdAt: '2025-04-20', branch: 'جدة' },
];

const BRANCHES = ['الرياض', 'جدة', 'الدمام', 'مكة', 'المدينة'];

interface Props { dict: any; locale: string; }

export default function UsersContent({ dict, locale }: Props) {
    const isRTL = locale === 'ar';
    const [users, setUsers] = useState<User[]>(INITIAL_USERS);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all');
    const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
    const [showModal, setShowModal] = useState(false);
    const [editUser, setEditUser] = useState<User | null>(null);
    const [showPermissions, setShowPermissions] = useState<User | null>(null);
    const [showDelete, setShowDelete] = useState<User | null>(null);
    const [successMsg, setSuccessMsg] = useState('');

    const emptyForm = { name: '', nameAr: '', email: '', phone: '', role: 'cashier' as Role, branch: 'الرياض', password: '' };
    const [form, setForm] = useState(emptyForm);

    const filtered = useMemo(() => users.filter(u => {
        const name = isRTL ? u.nameAr : u.name;
        const matchSearch = !search || name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()) || u.id.toLowerCase().includes(search.toLowerCase());
        const matchRole = roleFilter === 'all' || u.role === roleFilter;
        const matchStatus = statusFilter === 'all' || u.status === statusFilter;
        return matchSearch && matchRole && matchStatus;
    }), [users, search, roleFilter, statusFilter, isRTL]);

    const stats = [
        { label: isRTL ? 'إجمالي المستخدمين' : 'Total Users', value: users.length, icon: '👥', color: '#6366f1' },
        { label: isRTL ? 'نشطون' : 'Active', value: users.filter(u => u.status === 'active').length, icon: '✅', color: '#10b981' },
        { label: isRTL ? 'كاشير' : 'Cashiers', value: users.filter(u => u.role === 'cashier').length, icon: '💳', color: '#f59e0b' },
        { label: isRTL ? 'محاسبين' : 'Accountants', value: users.filter(u => u.role === 'accountant').length, icon: '📊', color: '#a78bfa' },
    ];

    const openAdd = () => { setEditUser(null); setForm(emptyForm); setShowModal(true); };
    const openEdit = (u: User) => { setEditUser(u); setForm({ name: u.name, nameAr: u.nameAr, email: u.email, phone: u.phone, role: u.role, branch: u.branch, password: '' }); setShowModal(true); };

    const saveUser = () => {
        if (!form.email) return;
        if (editUser) {
            setUsers(prev => prev.map(u => u.id === editUser.id ? { ...u, ...form } : u));
        } else {
            const newUser: User = { id: `USR-${String(users.length + 1).padStart(3, '0')}`, ...form, status: 'active', lastLogin: '—', createdAt: new Date().toISOString().slice(0, 10) };
            setUsers(prev => [newUser, ...prev]);
        }
        setShowModal(false);
        toast(isRTL ? '✅ تم حفظ المستخدم' : '✅ User saved');
    };

    const toggleStatus = (id: string) => {
        setUsers(prev => prev.map(u => u.id === id ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' } : u));
        toast(isRTL ? 'تم تغيير حالة المستخدم' : 'User status updated');
    };

    const deleteUser = () => {
        if (showDelete) { setUsers(prev => prev.filter(u => u.id !== showDelete.id)); setShowDelete(null); }
        toast(isRTL ? '🗑️ تم حذف المستخدم' : '🗑️ User deleted');
    };

    const toast = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };

    const handleExportPDF = () => {
        const headers = [
            isRTL ? 'الكود' : 'Code',
            isRTL ? 'الاسم' : 'Name',
            isRTL ? 'البريد' : 'Email',
            isRTL ? 'الدور' : 'Role',
            isRTL ? 'الفرع' : 'Branch',
            isRTL ? 'الحالة' : 'Status',
            isRTL ? 'آخر دخول' : 'Last Login',
        ];
        const rows = filtered.map(u => [
            u.id,
            isRTL ? u.nameAr : u.name,
            u.email,
            isRTL ? ROLES[u.role].ar : ROLES[u.role].en,
            u.branch,
            u.status === 'active' ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'غير نشط' : 'Inactive'),
            u.lastLogin,
        ]);
        const summaryCards = stats.map(s => ({ label: s.label, value: String(s.value) }));
        exportTableToPDF(
            isRTL ? 'تقرير المستخدمين والصلاحيات' : 'Users & Permissions Report',
            isRTL ? `إجمالي ${filtered.length} مستخدم` : `Total ${filtered.length} users`,
            headers,
            rows,
            summaryCards,
            isRTL
        );
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <span>👥</span> {isRTL ? 'إدارة المستخدمين والصلاحيات' : 'Users & Permissions'}
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                        {isRTL ? 'إدارة حسابات المستخدمين وأدوارهم' : 'Manage user accounts and roles'}
                    </p>
                </div>
                <div className="flex gap-3">
                    <button onClick={handleExportPDF} className="btn-secondary flex items-center gap-2 text-sm">
                        🖨️ {isRTL ? 'طباعة / PDF' : 'Print / PDF'}
                    </button>
                    <button onClick={openAdd} className="btn-primary flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        {isRTL ? 'إضافة مستخدم' : 'Add User'}
                    </button>
                </div>
            </div>

            {/* Toast */}
            {successMsg && (
                <div className="p-3 rounded-xl text-sm font-medium" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981' }}>
                    {successMsg}
                </div>
            )}

            {/* Roles Reference Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(Object.entries(ROLES) as [Role, typeof ROLES[Role]][]).map(([key, role]) => (
                    <div
                        key={key}
                        className="stat-card cursor-pointer"
                        onClick={() => setRoleFilter(roleFilter === key ? 'all' : key)}
                        style={roleFilter === key ? { border: `1px solid ${role.color}40`, background: role.bg } : {}}
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{isRTL ? role.ar : role.en}</p>
                                <p className="text-2xl font-bold" style={{ color: role.color }}>
                                    {users.filter(u => u.role === key).length}
                                </p>
                                <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                                    {role.permissions.slice(0, 2).join(' • ')}
                                    {role.permissions.length > 2 && ` +${role.permissions.length - 2}`}
                                </p>
                            </div>
                            <span className="text-2xl">{role.icon}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="glass-card p-6">
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 mb-5">
                    <h3 className="font-semibold me-auto" style={{ color: 'var(--text-primary)' }}>
                        {isRTL ? 'المستخدمون' : 'Users'}
                        <span className="text-xs font-normal ms-2 px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }}>{filtered.length}</span>
                    </h3>
                    <div className="relative">
                        <svg className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input type="text" className="input-field ps-10 py-2 text-sm w-52" placeholder={isRTL ? 'بحث...' : 'Search...'} value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <select className="select-field py-2 text-sm w-auto" value={roleFilter} onChange={e => setRoleFilter(e.target.value as any)}>
                        <option value="all">{isRTL ? 'كل الأدوار' : 'All Roles'}</option>
                        {(Object.entries(ROLES) as [Role, typeof ROLES[Role]][]).map(([key, r]) => (
                            <option key={key} value={key}>{isRTL ? r.ar : r.en}</option>
                        ))}
                    </select>
                    <select className="select-field py-2 text-sm w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
                        <option value="all">{isRTL ? 'الكل' : 'All'}</option>
                        <option value="active">{isRTL ? 'نشط' : 'Active'}</option>
                        <option value="inactive">{isRTL ? 'غير نشط' : 'Inactive'}</option>
                    </select>
                </div>

                <div className="overflow-x-auto">
                    <table className="data-table text-sm">
                        <thead>
                            <tr>
                                <th>{isRTL ? 'المستخدم' : 'User'}</th>
                                <th>{isRTL ? 'الدور' : 'Role'}</th>
                                <th>{isRTL ? 'الفرع' : 'Branch'}</th>
                                <th>{isRTL ? 'آخر دخول' : 'Last Login'}</th>
                                <th>{isRTL ? 'الحالة' : 'Status'}</th>
                                <th>{isRTL ? 'الإجراءات' : 'Actions'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(u => {
                                const role = ROLES[u.role];
                                return (
                                    <tr key={u.id}>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0"
                                                    style={{ background: role.bg, color: role.color }}>
                                                    {(isRTL ? u.nameAr : u.name)[0]}
                                                </div>
                                                <div>
                                                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{isRTL ? u.nameAr : u.name}</p>
                                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{u.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ background: role.bg, color: role.color }}>
                                                {role.icon} {isRTL ? role.ar : role.en}
                                            </span>
                                        </td>
                                        <td style={{ color: 'var(--text-secondary)' }}>{u.branch}</td>
                                        <td style={{ color: 'var(--text-muted)' }} className="text-xs">{u.lastLogin}</td>
                                        <td>
                                            {/* Toggle switch */}
                                            <button
                                                onClick={() => toggleStatus(u.id)}
                                                className="flex items-center gap-2 group"
                                                title={isRTL ? 'تبديل الحالة' : 'Toggle status'}
                                            >
                                                <div className={`w-10 h-5 rounded-full relative transition-colors duration-200 ${u.status === 'active' ? 'bg-green-500' : 'bg-gray-600'}`}>
                                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${u.status === 'active' ? (isRTL ? 'start-0.5' : 'start-5') : (isRTL ? 'start-5' : 'start-0.5')}`} />
                                                </div>
                                                <span className={`text-xs font-medium ${u.status === 'active' ? 'text-green-400' : 'text-gray-500'}`}>
                                                    {u.status === 'active' ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'موقوف' : 'Inactive')}
                                                </span>
                                            </button>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-1.5">
                                                {/* Permissions */}
                                                <button onClick={() => setShowPermissions(u)} className="btn-icon text-purple-400 hover:text-purple-300" title={isRTL ? 'الصلاحيات' : 'Permissions'}>
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                                                    </svg>
                                                </button>
                                                {/* Edit */}
                                                <button onClick={() => openEdit(u)} className="btn-icon" title={isRTL ? 'تعديل' : 'Edit'}>
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                                                    </svg>
                                                </button>
                                                {/* Delete */}
                                                <button onClick={() => setShowDelete(u)} className="btn-icon hover:!text-red-400" title={isRTL ? 'حذف' : 'Delete'}>
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filtered.length === 0 && (
                        <div className="text-center py-10">
                            <span className="text-3xl mb-2 block">🔍</span>
                            <p style={{ color: 'var(--text-muted)' }}>{isRTL ? 'لا توجد نتائج' : 'No results found'}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ─── Add/Edit User Modal ─── */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
                    <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-default)' }}>
                            <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                {editUser ? '✏️' : '➕'} {editUser ? (isRTL ? 'تعديل مستخدم' : 'Edit User') : (isRTL ? 'إضافة مستخدم' : 'Add User')}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="btn-icon">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold mb-1.5 uppercase" style={{ color: 'var(--text-muted)' }}>{isRTL ? 'الاسم (عربي)' : 'Name (AR)'}</label>
                                    <input className="input-field w-full py-2 text-sm" value={form.nameAr} onChange={e => setForm({ ...form, nameAr: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold mb-1.5 uppercase" style={{ color: 'var(--text-muted)' }}>{isRTL ? 'الاسم (إنجليزي)' : 'Name (EN)'}</label>
                                    <input className="input-field w-full py-2 text-sm" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold mb-1.5 uppercase" style={{ color: 'var(--text-muted)' }}>{isRTL ? 'البريد الإلكتروني *' : 'Email *'}</label>
                                <input type="email" className="input-field w-full py-2 text-sm" dir="ltr" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold mb-1.5 uppercase" style={{ color: 'var(--text-muted)' }}>{isRTL ? 'الجوال' : 'Phone'}</label>
                                    <input className="input-field w-full py-2 text-sm" dir="ltr" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold mb-1.5 uppercase" style={{ color: 'var(--text-muted)' }}>{isRTL ? 'الفرع' : 'Branch'}</label>
                                    <select className="select-field w-full py-2 text-sm" value={form.branch} onChange={e => setForm({ ...form, branch: e.target.value })}>
                                        {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold mb-2 uppercase" style={{ color: 'var(--text-muted)' }}>{isRTL ? 'الدور / الصلاحيات' : 'Role / Permissions'}</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(Object.entries(ROLES) as [Role, typeof ROLES[Role]][]).map(([key, role]) => (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => setForm({ ...form, role: key })}
                                            className="flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all"
                                            style={form.role === key
                                                ? { background: role.bg, border: `1px solid ${role.color}50`, color: role.color }
                                                : { background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }
                                            }
                                        >
                                            <span>{role.icon}</span>
                                            <div className="text-start">
                                                <p>{isRTL ? role.ar : role.en}</p>
                                                <p className="text-[10px] font-normal opacity-60">{role.permissions.slice(0, 2).join(', ')}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {!editUser && (
                                <div>
                                    <label className="block text-xs font-semibold mb-1.5 uppercase" style={{ color: 'var(--text-muted)' }}>{isRTL ? 'كلمة المرور' : 'Password'}</label>
                                    <input type="password" className="input-field w-full py-2 text-sm" dir="ltr" placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 flex gap-3 justify-end" style={{ borderTop: '1px solid var(--border-default)' }}>
                            <button onClick={() => setShowModal(false)} className="btn-secondary">{isRTL ? 'إلغاء' : 'Cancel'}</button>
                            <button onClick={saveUser} className="btn-primary">{isRTL ? 'حفظ' : 'Save'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Permissions Modal ─── */}
            {showPermissions && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
                    <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-default)' }}>
                            <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                🛡️ {isRTL ? 'صلاحيات' : 'Permissions'}: {isRTL ? showPermissions.nameAr : showPermissions.name}
                            </h2>
                            <button onClick={() => setShowPermissions(null)} className="btn-icon">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-5 p-3 rounded-xl" style={{ background: ROLES[showPermissions.role].bg }}>
                                <span className="text-3xl">{ROLES[showPermissions.role].icon}</span>
                                <div>
                                    <p className="font-bold" style={{ color: ROLES[showPermissions.role].color }}>
                                        {isRTL ? ROLES[showPermissions.role].ar : ROLES[showPermissions.role].en}
                                    </p>
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                        {showPermissions.email}
                                    </p>
                                </div>
                            </div>
                            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
                                {isRTL ? 'الصلاحيات الممنوحة' : 'Granted Permissions'}
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                                {ROLES[showPermissions.role].permissions.map(perm => (
                                    <div key={perm} className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: 'var(--bg-input)' }}>
                                        <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{perm}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="px-6 py-4" style={{ borderTop: '1px solid var(--border-default)' }}>
                            <button onClick={() => setShowPermissions(null)} className="btn-secondary w-full">{isRTL ? 'إغلاق' : 'Close'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Delete Confirm ─── */}
            {showDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
                    <div className="w-full max-w-sm rounded-2xl p-6 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid rgba(239,68,68,0.3)' }}>
                        <span className="text-5xl block mb-3">⚠️</span>
                        <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{isRTL ? 'حذف المستخدم' : 'Delete User'}</h3>
                        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                            {isRTL ? `هل تريد حذف "${showDelete.nameAr}"؟` : `Delete "${showDelete.name}"?`}
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => setShowDelete(null)} className="btn-secondary">{isRTL ? 'إلغاء' : 'Cancel'}</button>
                            <button onClick={deleteUser} className="btn-primary" style={{ background: '#dc2626' }}>{isRTL ? 'حذف' : 'Delete'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
