"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { hrApi } from '@/lib/api';

type LeaveType = 'annual' | 'sick' | 'unpaid' | 'other';
type LeaveStatus = 'pending' | 'approved' | 'rejected';

const LEAVE_TYPE_CONFIG: Record<LeaveType, { ar: string; en: string; color: string; icon: string }> = {
    annual:  { ar: 'إجازة سنوية',      en: 'Annual Leave',   color: 'bg-blue-100 text-blue-700',   icon: '🌴' },
    sick:    { ar: 'إجازة مرضية',       en: 'Sick Leave',     color: 'bg-red-100 text-red-700',     icon: '🏥' },
    unpaid:  { ar: 'إجازة بدون راتب',   en: 'Unpaid Leave',   color: 'bg-orange-100 text-orange-700', icon: '⚠️' },
    other:   { ar: 'إجازة أخرى',        en: 'Other',          color: 'bg-slate-100 text-slate-600', icon: '📝' },
};

const STATUS_CONFIG: Record<LeaveStatus, { ar: string; en: string; color: string }> = {
    pending:  { ar: 'قيد الانتظار', en: 'Pending',  color: 'bg-yellow-100 text-yellow-700' },
    approved: { ar: 'موافق عليه',   en: 'Approved', color: 'bg-green-100 text-green-700' },
    rejected: { ar: 'مرفوض',        en: 'Rejected', color: 'bg-red-100 text-red-700' },
};

const EMPTY_FORM = { employee_id: '', start_date: '', end_date: '', type: 'annual' as LeaveType, reason: '' };

export default function LeavesPage() {
    const { isRTL, locale } = useLanguage();
    const [leaves, setLeaves] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState<any>(EMPTY_FORM);
    const [filterType, setFilterType] = useState('all');

    const fetchLeaves = useCallback(async () => {
        setLoading(true);
        try {
            const res = await hrApi.getLeaves({});
            setLeaves(res.data?.data || res.data || []);
        } catch { setLeaves([]); } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchLeaves(); }, [fetchLeaves]);
    useEffect(() => {
        hrApi.getEmployees({}).then(r => setEmployees(r.data?.data || r.data || [])).catch(() => {});
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await hrApi.applyLeave(form);
            setIsModalOpen(false);
            setForm(EMPTY_FORM);
            fetchLeaves();
        } catch (err: any) { alert(err?.response?.data?.message || 'Error applying leave'); }
    };

    const handleStatus = async (id: string, status: LeaveStatus) => {
        try {
            await hrApi.updateLeaveStatus(id, status);
            fetchLeaves();
        } catch {}
    };

    const calcDays = (start: string, end: string) => {
        if (!start || !end) return 0;
        const diff = new Date(end).getTime() - new Date(start).getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
    };

    const filtered = filterType === 'all' ? leaves : leaves.filter(l => l.type === filterType);
    const totalPending = leaves.filter(l => l.status === 'pending' || !l.status).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-600">
                        🌴 {isRTL ? 'إدارة الإجازات' : 'Leave Management'}
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm">{isRTL ? 'إدارة وموافقة طلبات الإجازات للموظفين' : 'Manage and approve employee leave requests'}</p>
                </div>
                <div className="flex gap-2 items-center">
                    {totalPending > 0 && (
                        <span className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium">
                            ⏳ {totalPending} {isRTL ? 'طلب بانتظار الموافقة' : 'pending request(s)'}
                        </span>
                    )}
                    <button onClick={() => { setForm(EMPTY_FORM); setIsModalOpen(true); }}
                        className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl hover:opacity-90 transition font-medium shadow-sm flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                        {isRTL ? 'طلب إجازة جديد' : 'New Leave Request'}
                    </button>
                </div>
            </div>

            {/* Type Filter */}
            <div className="flex gap-2 flex-wrap">
                {[
                    { k: 'all', ar: 'الكل', en: 'All' },
                    ...Object.entries(LEAVE_TYPE_CONFIG).map(([k, v]) => ({ k, ar: v.ar, en: v.en })),
                ].map(f => (
                    <button key={f.k} onClick={() => setFilterType(f.k)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition ${filterType === f.k ? 'bg-teal-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 hover:border-teal-300'}`}>
                        {isRTL ? f.ar : f.en} {filterType === f.k && `(${filtered.length})`}
                    </button>
                ))}
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(LEAVE_TYPE_CONFIG).map(([k, v]) => {
                    const count = leaves.filter(l => l.type === k).length;
                    const approved = leaves.filter(l => l.type === k && l.status === 'approved').length;
                    return (
                        <div key={k} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xl">{v.icon}</span>
                                <span className="text-xs text-slate-500">{isRTL ? v.ar : v.en}</span>
                            </div>
                            <p className="text-2xl font-bold">{count}</p>
                            <p className="text-xs text-slate-400 mt-1">{approved} {isRTL ? 'موافق عليه' : 'approved'}</p>
                        </div>
                    );
                })}
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                {loading ? (
                    <div className="text-center py-16 text-slate-400">{isRTL ? 'جاري التحميل...' : 'Loading...'}</div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                {[isRTL ? 'الموظف' : 'Employee', isRTL ? 'نوع الإجازة' : 'Leave Type',
                                  isRTL ? 'من' : 'From', isRTL ? 'إلى' : 'To', isRTL ? 'الأيام' : 'Days',
                                  isRTL ? 'السبب' : 'Reason', isRTL ? 'الحالة' : 'Status', isRTL ? 'إجراءات' : 'Actions'].map(h => (
                                    <th key={h} className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(leave => {
                                const typeCfg = LEAVE_TYPE_CONFIG[leave.type as LeaveType] || LEAVE_TYPE_CONFIG.other;
                                const statusCfg = STATUS_CONFIG[(leave.status as LeaveStatus) || 'pending'];
                                const days = calcDays(leave.start_date, leave.end_date);
                                return (
                                    <tr key={leave.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                                        <td className={`px-4 py-3 font-medium ${isRTL ? 'text-right' : ''}`}>{leave.employee?.name || '-'}</td>
                                        <td className={`px-4 py-3 ${isRTL ? 'text-right' : ''}`}>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeCfg.color}`}>{typeCfg.icon} {isRTL ? typeCfg.ar : typeCfg.en}</span>
                                        </td>
                                        <td className={`px-4 py-3 text-slate-500 ${isRTL ? 'text-right' : ''}`}>{leave.start_date}</td>
                                        <td className={`px-4 py-3 text-slate-500 ${isRTL ? 'text-right' : ''}`}>{leave.end_date}</td>
                                        <td className={`px-4 py-3 font-bold text-center ${isRTL ? 'text-right' : ''}`}>{days}</td>
                                        <td className={`px-4 py-3 text-slate-600 max-w-xs truncate ${isRTL ? 'text-right' : ''}`}>{leave.reason}</td>
                                        <td className={`px-4 py-3 ${isRTL ? 'text-right' : ''}`}>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusCfg.color}`}>{isRTL ? statusCfg.ar : statusCfg.en}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-1 flex-wrap">
                                                {(!leave.status || leave.status === 'pending') && (
                                                    <>
                                                        <button onClick={() => handleStatus(leave.id, 'approved')}
                                                            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 font-medium">
                                                            ✅ {isRTL ? 'موافقة' : 'Approve'}
                                                        </button>
                                                        <button onClick={() => handleStatus(leave.id, 'rejected')}
                                                            className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200">
                                                            ❌ {isRTL ? 'رفض' : 'Reject'}
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filtered.length === 0 && (
                                <tr><td colSpan={8} className="text-center py-14 text-slate-400">
                                    <div className="text-5xl mb-3">🌴</div>
                                    <p>{isRTL ? 'لا توجد طلبات إجازة' : 'No leave requests found'}</p>
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Create Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="font-bold text-lg">🌴 {isRTL ? 'طلب إجازة جديد' : 'New Leave Request'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1.5">{isRTL ? 'الموظف' : 'Employee'} *</label>
                                <select required value={form.employee_id} onChange={e => setForm((f: any) => ({...f, employee_id: e.target.value}))}
                                    className="w-full p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm">
                                    <option value="">{isRTL ? '-- اختر موظف --' : '-- Select Employee --'}</option>
                                    {employees.map((emp: any) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5">{isRTL ? 'نوع الإجازة' : 'Leave Type'}</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(LEAVE_TYPE_CONFIG).map(([k, v]) => (
                                        <button key={k} type="button" onClick={() => setForm((f: any) => ({...f, type: k}))}
                                            className={`p-2.5 rounded-lg border text-sm text-left transition ${form.type === k ? `${v.color} border-current` : 'border-slate-200 dark:border-slate-600 hover:border-slate-300'}`}>
                                            {v.icon} {isRTL ? v.ar : v.en}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">{isRTL ? 'من تاريخ' : 'From'} *</label>
                                    <input required type="date" value={form.start_date} onChange={e => setForm((f: any) => ({...f, start_date: e.target.value}))}
                                        className="w-full p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">{isRTL ? 'إلى تاريخ' : 'To'} *</label>
                                    <input required type="date" value={form.end_date} min={form.start_date} onChange={e => setForm((f: any) => ({...f, end_date: e.target.value}))}
                                        className="w-full p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm"/>
                                </div>
                            </div>
                            {form.start_date && form.end_date && (
                                <div className="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-800 text-sm text-teal-700 dark:text-teal-400 font-medium">
                                    📅 {isRTL ? 'عدد الأيام:' : 'Total Days:'} <strong>{calcDays(form.start_date, form.end_date)}</strong>
                                    {form.type === 'unpaid' && <span className="ml-2 text-orange-600">{isRTL ? '⚠️ (ستُخصم من الراتب)' : '⚠️ (Will be deducted from salary)'}</span>}
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium mb-1.5">{isRTL ? 'سبب الإجازة' : 'Reason'} *</label>
                                <textarea required rows={3} value={form.reason} onChange={e => setForm((f: any) => ({...f, reason: e.target.value}))}
                                    className="w-full p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm"/>
                            </div>
                            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm bg-slate-100 rounded-lg hover:bg-slate-200">{isRTL ? 'إلغاء' : 'Cancel'}</button>
                                <button type="submit" className="px-5 py-2 text-sm bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-medium hover:opacity-90">
                                    {isRTL ? '→ تقديم طلب الإجازة' : '→ Submit Request'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
