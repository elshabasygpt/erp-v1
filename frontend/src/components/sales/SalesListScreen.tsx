'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api, { inventoryApi, crmApi } from '@/lib/api';
import {
  Loader2, Search, Download, Plus, ChevronDown, ChevronUp,
  X, Printer, AlertCircle, RotateCcw, FileText, ArrowLeftRight
} from 'lucide-react';
import { format } from 'date-fns';
import { Invoice } from '@/types';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

/* ────────── helpers ────────── */
const STATUS_LABELS: Record<string, string> = {
  confirmed: 'معتمد',
  draft: 'مسودة',
  cancelled: 'ملغي',
  returned: 'مرتجع',
};

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
  cancelled: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400',
  returned:  'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400',
  draft:     'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
};

function safeFormatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? '—' : format(d, 'yyyy-MM-dd');
}

function downloadCSV(invoices: Invoice[], fmt: (v: number) => string) {
  const headers = ['رقم الفاتورة', 'العميل', 'التاريخ', 'الإجمالي', 'المدفوع', 'المتبقي', 'الحالة', 'النوع'];
  const rows = invoices.map(inv => {
    const paid = Number(inv.paid_amount ?? (inv.type === 'cash' ? inv.total : 0));
    const due  = inv.type === 'cash' ? 0 : Number(inv.total) - paid;
    return [
      inv.invoice_number,
      inv.customer?.name ?? 'عميل نقدي',
      safeFormatDate(inv.invoice_date || inv.created_at),
      fmt(inv.total),
      fmt(paid),
      fmt(due),
      STATUS_LABELS[inv.status] ?? inv.status,
      inv.type === 'cash' ? 'نقدي' : 'آجل',
    ];
  });

  const csv = [headers, ...rows]
    .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `invoices-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  // Delay revoke so the browser can initiate the download first
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

function SortIcon({ col, sortBy, sortDesc }: { col: string; sortBy: string; sortDesc: boolean }) {
  return sortBy === col
    ? sortDesc ? <ChevronDown className="w-3.5 h-3.5 text-blue-500" /> : <ChevronUp className="w-3.5 h-3.5 text-blue-500" />
    : <ChevronDown className="w-3.5 h-3.5 opacity-20" />;
}

/* ────────── component ────────── */
export default function SalesListScreen() {
  const router = useRouter();
  const { format: formatCurrency } = useCurrencyFormatter();

  // Data
  const [invoices, setInvoices]   = useState<Invoice[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  // Pagination
  const [page, setPage]           = useState(1);
  const [perPage, setPerPage]     = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Sorting
  const [sortBy, setSortBy]       = useState('invoice_date');
  const [sortDesc, setSortDesc]   = useState(true);

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch]           = useState('');          // debounced value
  const [dateFrom, setDateFrom]       = useState('');
  const [dateTo, setDateTo]           = useState('');
  const [status, setStatus]           = useState('all');
  const [filters, setFilters]         = useState({
    branch_id: '', warehouse_id: '', customer_id: '', employee_id: '',
  });

  // Lookup lists
  const [branches, setBranches]     = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [customers, setCustomers]   = useState<any[]>([]);
  const [employees, setEmployees]   = useState<any[]>([]);

  // Modal
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Debounce ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── load lookup data once ── */
  useEffect(() => {
    const extract = (res: any): any[] => {
      const d = res.data?.data?.data ?? res.data?.data ?? res.data ?? [];
      return Array.isArray(d) ? d : [];
    };
    inventoryApi.getBranches().then(r => setBranches(extract(r))).catch(() => {});
    inventoryApi.getWarehouses().then(r => setWarehouses(extract(r))).catch(() => {});
    crmApi.getCustomers().then(r => setCustomers(extract(r))).catch(() => {});
    api.get('/users?role=sales').then(r => setEmployees(extract(r))).catch(() => {});
  }, []);

  /* ── debounce search input ── */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput]);

  /* ── fetch invoices ── */
  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, any> = {
        page,
        limit: perPage,
        sort_by: sortBy,
        sort_desc: sortDesc,
      };
      if (search)               params.invoice_number = search;
      if (dateFrom)             params.date_from      = dateFrom;
      if (dateTo)               params.date_to        = dateTo;
      if (status !== 'all')     params.status         = status;
      if (filters.branch_id)    params.branch_id      = filters.branch_id;
      if (filters.warehouse_id) params.warehouse_id   = filters.warehouse_id;
      if (filters.customer_id)  params.customer_id    = filters.customer_id;
      if (filters.employee_id)  params.employee_id    = filters.employee_id;

      const res = await api.get('/sales/invoices', { params });
      setInvoices(res.data.data ?? []);
      setTotalPages(res.data.meta?.last_page ?? 1);
      setTotalItems(res.data.meta?.total ?? 0);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'حدث خطأ أثناء تحميل الفواتير');
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, search, dateFrom, dateTo, status, sortBy, sortDesc, filters]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  /* ── helpers ── */
  const handleSort = (col: string) => {
    if (sortBy === col) setSortDesc(d => !d);
    else { setSortBy(col); setSortDesc(true); }
    setPage(1);
  };

  const resetFilters = () => {
    setSearchInput('');
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setStatus('all');
    setFilters({ branch_id: '', warehouse_id: '', customer_id: '', employee_id: '' });
    setPage(1);
  };

  // Reacts immediately to typing — controls reset button visibility
  const hasActiveFilters = !!(
    searchInput || dateFrom || dateTo || status !== 'all' ||
    filters.branch_id || filters.warehouse_id || filters.customer_id || filters.employee_id
  );
  // Reflects what was actually sent to the API — controls empty-state message
  const hasActiveAPIFilters = !!(
    search || dateFrom || dateTo || status !== 'all' ||
    filters.branch_id || filters.warehouse_id || filters.customer_id || filters.employee_id
  );

  const firstItem = totalItems === 0 ? 0 : (page - 1) * perPage + 1;
  const lastItem  = Math.min(page * perPage, totalItems);

  /* ═══════════════════════════════ RENDER ═══════════════════════════════ */
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-[#1a1a2e] p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white">قائمة المبيعات</h2>
          <p className="text-sm text-slate-500 dark:text-white/50 mt-1">إدارة جميع فواتير المبيعات وعرض التفاصيل</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <a
            href="/dashboard/sales/create"
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-blue-500/30"
          >
            <Plus className="w-4 h-4" />
            إنشاء فاتورة
          </a>
          <button
            onClick={() => downloadCSV(invoices, formatCurrency)}
            disabled={invoices.length === 0}
            className="px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-40 text-slate-700 dark:text-white rounded-xl font-bold transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            تصدير CSV
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white rounded-xl font-bold transition-colors flex items-center gap-2 print:hidden"
          >
            <Printer className="w-4 h-4" />
            طباعة
          </button>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl text-rose-700 dark:text-rose-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium flex-1">{error}</span>
          <button onClick={fetchInvoices} className="text-xs underline font-bold">إعادة المحاولة</button>
        </div>
      )}

      {/* ── Table Card ── */}
      <div className="bg-white dark:bg-[#1a1a2e] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden print:shadow-none print:border-none">

        {/* ── Filters ── */}
        <div className="p-4 border-b border-slate-200 dark:border-white/10 space-y-3 print:hidden">
          {/* Row 1: Search + Date range + Reset */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Search */}
            <div className="relative md:col-span-4">
              <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3 text-slate-400" />
              <input
                type="text"
                placeholder="بحث برقم الفاتورة..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="w-full pr-9 pl-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white"
              />
            </div>
            {/* Date From */}
            <input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPage(1); }}
              className="md:col-span-2 px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white"
            />
            {/* Date To */}
            <input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPage(1); }}
              className="md:col-span-2 px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white"
            />
            {/* Per page */}
            <select
              value={perPage}
              onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
              className="md:col-span-2 px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white appearance-none"
            >
              <option value={15}>15 لكل صفحة</option>
              <option value={25}>25 لكل صفحة</option>
              <option value={50}>50 لكل صفحة</option>
            </select>
            {/* Reset */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="md:col-span-2 flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-sm font-bold transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                مسح الفلاتر
              </button>
            )}
          </div>

          {/* Row 2: Dropdowns */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {/* Status */}
            <select
              value={status}
              onChange={e => { setStatus(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white appearance-none"
            >
              <option value="all">كل الحالات</option>
              <option value="confirmed">معتمد</option>
              <option value="draft">مسودة</option>
              <option value="cancelled">ملغي</option>
              <option value="returned">مرتجع</option>
            </select>
            {/* Customer */}
            <select
              value={filters.customer_id}
              onChange={e => { setFilters(p => ({ ...p, customer_id: e.target.value })); setPage(1); }}
              className="px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white appearance-none"
            >
              <option value="">كل العملاء</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {/* Warehouse */}
            <select
              value={filters.warehouse_id}
              onChange={e => { setFilters(p => ({ ...p, warehouse_id: e.target.value })); setPage(1); }}
              className="px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white appearance-none"
            >
              <option value="">كل المستودعات</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            {/* Branch */}
            <select
              value={filters.branch_id}
              onChange={e => { setFilters(p => ({ ...p, branch_id: e.target.value })); setPage(1); }}
              className="px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white appearance-none"
            >
              <option value="">كل الفروع</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            {/* Employee */}
            <select
              value={filters.employee_id}
              onChange={e => { setFilters(p => ({ ...p, employee_id: e.target.value })); setPage(1); }}
              className="px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white appearance-none"
            >
              <option value="">كل الموظفين</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm rtl:text-right text-slate-500 dark:text-slate-400">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-white/5 dark:text-slate-300">
              <tr>
                <th className="px-6 py-4 font-black cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors" onClick={() => handleSort('invoice_number')}>
                  <div className="flex items-center gap-1.5">الفاتورة <SortIcon col="invoice_number" sortBy={sortBy} sortDesc={sortDesc} /></div>
                </th>
                <th className="px-6 py-4 font-black">العميل</th>
                <th className="px-6 py-4 font-black cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors" onClick={() => handleSort('invoice_date')}>
                  <div className="flex items-center gap-1.5">التاريخ <SortIcon col="invoice_date" sortBy={sortBy} sortDesc={sortDesc} /></div>
                </th>
                <th className="px-6 py-4 font-black cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors" onClick={() => handleSort('total')}>
                  <div className="flex items-center gap-1.5">الإجمالي <SortIcon col="total" sortBy={sortBy} sortDesc={sortDesc} /></div>
                </th>
                <th className="px-6 py-4 font-black">المدفوع</th>
                <th className="px-6 py-4 font-black">المتبقي</th>
                <th className="px-6 py-4 font-black cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors" onClick={() => handleSort('status')}>
                  <div className="flex items-center gap-1.5">الحالة <SortIcon col="status" sortBy={sortBy} sortDesc={sortDesc} /></div>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
                    <p className="mt-3 text-sm text-slate-400">جارٍ التحميل...</p>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <FileText className="w-12 h-12 text-slate-300 dark:text-white/10 mx-auto mb-3" />
                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                      {hasActiveAPIFilters ? 'لا توجد نتائج بالفلاتر الحالية' : 'لا توجد فواتير بعد'}
                    </p>
                    {hasActiveAPIFilters && (
                      <button onClick={resetFilters} className="mt-2 text-sm text-blue-500 hover:underline">مسح الفلاتر</button>
                    )}
                  </td>
                </tr>
              ) : (
                invoices.map(inv => {
                  const paid = Number(inv.paid_amount ?? (inv.type === 'cash' ? inv.total : 0));
                  const due  = inv.type === 'cash' ? 0 : Number(inv.total) - paid;
                  return (
                    <tr
                      key={inv.id}
                      onClick={() => setSelectedInvoice(inv)}
                      className="bg-white dark:bg-[#1a1a2e] border-b border-slate-100 dark:border-white/5 hover:bg-blue-50/50 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4 font-bold text-blue-600 dark:text-blue-400 group-hover:underline">
                        {inv.invoice_number}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800 dark:text-white">
                        {inv.customer?.name ?? 'عميل نقدي'}
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                        {safeFormatDate(inv.invoice_date || inv.created_at)}
                      </td>
                      <td className="px-6 py-4 font-black text-slate-800 dark:text-white">
                        {formatCurrency(inv.total)}
                      </td>
                      <td className="px-6 py-4 font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(paid)}
                      </td>
                      <td className={`px-6 py-4 font-bold ${due > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
                        {formatCurrency(due)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-black tracking-widest uppercase ${STATUS_COLORS[inv.status] ?? STATUS_COLORS.draft}`}>
                          {STATUS_LABELS[inv.status] ?? inv.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {!loading && totalItems > 0 && (
          <div className="p-4 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              عرض {firstItem}–{lastItem} من إجمالي {totalItems} فاتورة
            </span>
            <div className="flex gap-1 items-center">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-40 rounded-lg text-sm font-bold text-slate-700 dark:text-white transition-colors"
              >
                السابق
              </button>
              {/* page numbers (up to 5 visible) */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | 'ellipsis')[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('ellipsis');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === 'ellipsis' ? (
                    <span key={`e${i}`} className="px-2 text-slate-400 text-sm">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className={`w-8 h-8 rounded-lg text-sm font-bold transition-colors ${
                        page === p
                          ? 'bg-blue-600 text-white shadow shadow-blue-500/30'
                          : 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-40 rounded-lg text-sm font-bold text-slate-700 dark:text-white transition-colors"
              >
                التالي
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════ Detail Modal ══════════════ */}
      {selectedInvoice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm print:bg-white print:p-0 print:block"
          onClick={e => { if (e.target === e.currentTarget) setSelectedInvoice(null); }}
        >
          <div className="bg-white dark:bg-[#1a1a2e] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] print:shadow-none print:h-auto print:max-w-full">

            {/* Modal header */}
            <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-white/10 print:hidden">
              <h3 className="font-bold text-slate-800 dark:text-white">تفاصيل الفاتورة</h3>
              <div className="flex gap-2">
                {/* Create Return */}
                {selectedInvoice.status === 'confirmed' && (
                  <button
                    onClick={() => router.push(`/dashboard/returns/sales/new?invoice_id=${selectedInvoice.id}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 dark:bg-purple-500/10 hover:bg-purple-100 dark:hover:bg-purple-500/20 border border-purple-200 dark:border-purple-500/20 text-purple-700 dark:text-purple-400 rounded-lg text-xs font-bold transition-colors"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    إنشاء مرتجع
                  </button>
                )}
                {/* Print */}
                <button
                  onClick={() => window.print()}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-slate-500 transition-colors"
                  title="طباعة"
                >
                  <Printer className="w-5 h-5" />
                </button>
                {/* Close */}
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="p-2 hover:bg-rose-100 dark:hover:bg-rose-500/10 rounded-lg text-slate-500 hover:text-rose-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div className="p-6 overflow-y-auto print:overflow-visible space-y-6">
              {/* Invoice number + date */}
              <div className="text-center">
                <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-widest">
                  {selectedInvoice.invoice_number}
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  {safeFormatDate(selectedInvoice.invoice_date || selectedInvoice.created_at)}
                </p>
                <span className={`inline-block mt-2 px-3 py-1 rounded-md text-[11px] font-black tracking-widest uppercase ${STATUS_COLORS[selectedInvoice.status] ?? STATUS_COLORS.draft}`}>
                  {STATUS_LABELS[selectedInvoice.status] ?? selectedInvoice.status}
                </span>
              </div>

              {/* Customer + Payment info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl space-y-1">
                  <div className="text-xs text-slate-500 font-medium">العميل</div>
                  <div className="font-bold text-slate-800 dark:text-white">
                    {selectedInvoice.customer?.name ?? 'عميل نقدي'}
                  </div>
                  {selectedInvoice.customer?.phone && (
                    <div className="text-xs text-slate-500">{selectedInvoice.customer.phone}</div>
                  )}
                  {selectedInvoice.customer?.balance !== undefined && (
                    <div className={`text-xs font-bold mt-1 ${selectedInvoice.customer.balance < 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                      الرصيد: {formatCurrency(selectedInvoice.customer.balance)}
                    </div>
                  )}
                </div>
                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl space-y-1">
                  <div className="text-xs text-slate-500 font-medium">بيانات الدفع</div>
                  <div className="font-bold text-slate-800 dark:text-white capitalize">
                    {selectedInvoice.type === 'cash' ? 'نقدي' : 'آجل'}
                  </div>
                  {selectedInvoice.due_date && (
                    <div className="text-xs text-slate-500">
                      تاريخ الاستحقاق: {safeFormatDate(selectedInvoice.due_date)}
                    </div>
                  )}
                  {selectedInvoice.notes && (
                    <div className="text-xs text-slate-400 mt-1">{selectedInvoice.notes}</div>
                  )}
                </div>
              </div>

              {/* Items table */}
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 dark:border-white/10 text-slate-500 text-[10px] uppercase tracking-widest">
                  <tr>
                    <th className="py-2 text-start">المنتج</th>
                    <th className="py-2 text-center">الكمية</th>
                    <th className="py-2 text-center">السعر</th>
                    <th className="py-2 text-end">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {selectedInvoice.items?.map((item: any) => (
                    <tr key={item.id}>
                      <td className="py-3 font-bold text-slate-800 dark:text-white">
                        {item.product?.name ?? item.product_name}
                      </td>
                      <td className="py-3 text-center text-slate-600 dark:text-slate-400">{item.quantity}</td>
                      <td className="py-3 text-center text-slate-600 dark:text-slate-400">{formatCurrency(item.unit_price)}</td>
                      <td className="py-3 text-end font-bold text-slate-800 dark:text-white">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="space-y-2 border-t border-slate-200 dark:border-white/10 pt-4 w-1/2 mr-0 ml-auto rtl:ml-0 rtl:mr-auto">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">المجموع الفرعي</span>
                  <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(selectedInvoice.subtotal)}</span>
                </div>
                {selectedInvoice.discount_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">الخصم</span>
                    <span className="font-bold text-rose-600">- {formatCurrency(selectedInvoice.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">ضريبة القيمة المضافة</span>
                  <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(selectedInvoice.vat_amount)}</span>
                </div>
                <div className="flex justify-between text-lg pt-2 border-t border-slate-100 dark:border-white/5">
                  <span className="font-black text-slate-800 dark:text-white">الإجمالي</span>
                  <span className="font-black text-blue-600 dark:text-blue-400">{formatCurrency(selectedInvoice.total)}</span>
                </div>
                {selectedInvoice.type === 'credit' && (
                  <>
                    <div className="flex justify-between text-sm pt-1">
                      <span className="text-emerald-600 dark:text-emerald-400">المدفوع</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(selectedInvoice.paid_amount ?? 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-rose-600 dark:text-rose-400">المتبقي</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400">
                        {formatCurrency(Number(selectedInvoice.total) - Number(selectedInvoice.paid_amount ?? 0))}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
