'use client';

import React, { useState, useEffect, useRef } from 'react';

import api, { inventoryApi, crmApi } from '@/lib/api';
import { Loader2, Search, Filter, Download, Plus, ChevronDown, ChevronUp, X, Printer } from 'lucide-react';
import { format } from 'date-fns';

export default function SalesListScreen() {
  const isRTL = true;
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState('all');
  const [sortBy, setSortBy] = useState('invoice_date');
  const [sortDesc, setSortDesc] = useState(true);
  
  const [filters, setFilters] = useState({ branch_id: '', warehouse_id: '', customer_id: '' });
  const [branches, setBranches] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  // Modal State
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  useEffect(() => {
    const extractArray = (res: any) => {
        const data = res.data?.data?.data || res.data?.data || res.data || [];
        return Array.isArray(data) ? data : [];
    };
    inventoryApi.getBranches().then(res => setBranches(extractArray(res))).catch(() => setBranches([]));
    inventoryApi.getWarehouses().then(res => setWarehouses(extractArray(res))).catch(() => setWarehouses([]));
    crmApi.getCustomers().then(res => setCustomers(extractArray(res))).catch(() => setCustomers([]));
    api.get('/users?role=sales').then(res => setEmployees(extractArray(res))).catch(() => setEmployees([]));
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [page, search, dateFrom, dateTo, status, sortBy, sortDesc, filters]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 15,
        invoice_number: search || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        status: status !== 'all' ? status : undefined,
        branch_id: filters.branch_id || undefined,
        warehouse_id: filters.warehouse_id || undefined,
        customer_id: filters.customer_id || undefined,
        sort_by: sortBy,
        sort_desc: sortDesc
      };
      const res = await api.get('/sales/invoices', { params });
      setInvoices(res.data.data || []);
      setTotalPages(res.data.meta?.last_page || 1);
      setTotalItems(res.data.meta?.total || 0);
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortDesc(!sortDesc);
    } else {
      setSortBy(col);
      setSortDesc(true);
    }
  };

  const handleExport = () => {
    window.print(); // Simple export for now
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2 }).format(val || 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-[#1a1a2e] p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white">
            {isRTL ? 'قائمة المبيعات' : 'Sales List'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-white/50 mt-1">
            {isRTL ? 'إدارة جميع فواتير المبيعات وعرض التفاصيل' : 'Manage all sales invoices and view details'}
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <a href="/dashboard/sales/create" className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-blue-500/30">
            <Plus className="w-4 h-4" />
            {isRTL ? 'إنشاء فاتورة' : 'Create Sale'}
          </a>
          <button onClick={handleExport} className="px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white rounded-xl font-bold transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" />
            {isRTL ? 'تصدير / طباعة' : 'Export / Print'}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1a1a2e] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden print:shadow-none print:border-none">
        <div className="p-4 border-b border-slate-200 dark:border-white/10 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 print:hidden">
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 left-3 text-slate-400" />
            <input 
              type="text" 
              placeholder={isRTL ? 'بحث برقم الفاتورة...' : 'Search invoice no...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white"
            />
          </div>
          <select value={filters.customer_id} onChange={e=>setFilters(p=>({...p, customer_id: e.target.value}))} className="px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white appearance-none">
            <option value="">{isRTL ? 'كل العملاء' : 'All Customers'}</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filters.warehouse_id} onChange={e=>setFilters(p=>({...p, warehouse_id: e.target.value}))} className="px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white appearance-none">
            <option value="">{isRTL ? 'كل المستودعات' : 'All Warehouses'}</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <select value={status} onChange={e=>setStatus(e.target.value)} className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white appearance-none cursor-pointer">
            <option value="all">{isRTL ? 'كل الحالات' : 'All Status'}</option>
            <option value="confirmed">{isRTL ? 'معتمد' : 'Confirmed'}</option>
            <option value="draft">{isRTL ? 'مسودة' : 'Draft'}</option>
            <option value="cancelled">{isRTL ? 'ملغي' : 'Cancelled'}</option>
          </select>
          <div className="flex items-center gap-1">
            <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="w-full px-2 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[11px] outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white"/>
            <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="w-full px-2 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[11px] outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white"/>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left rtl:text-right text-slate-500 dark:text-slate-400">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-white/5 dark:text-slate-300">
              <tr>
                <th className="px-6 py-4 font-black cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors" onClick={() => handleSort('invoice_number')}>
                  <div className="flex items-center gap-2">{isRTL ? 'الفاتورة' : 'Invoice'} {sortBy==='invoice_number' && (sortDesc ? <ChevronDown className="w-4 h-4"/> : <ChevronUp className="w-4 h-4"/>)}</div>
                </th>
                <th className="px-6 py-4 font-black">{isRTL ? 'العميل' : 'Customer'}</th>
                <th className="px-6 py-4 font-black cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors" onClick={() => handleSort('invoice_date')}>
                  <div className="flex items-center gap-2">{isRTL ? 'التاريخ' : 'Date'} {sortBy==='invoice_date' && (sortDesc ? <ChevronDown className="w-4 h-4"/> : <ChevronUp className="w-4 h-4"/>)}</div>
                </th>
                <th className="px-6 py-4 font-black cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors" onClick={() => handleSort('total')}>
                  <div className="flex items-center gap-2">{isRTL ? 'الإجمالي' : 'Total'} {sortBy==='total' && (sortDesc ? <ChevronDown className="w-4 h-4"/> : <ChevronUp className="w-4 h-4"/>)}</div>
                </th>
                <th className="px-6 py-4 font-black">{isRTL ? 'المدفوع' : 'Paid'}</th>
                <th className="px-6 py-4 font-black">{isRTL ? 'المتبقي' : 'Due'}</th>
                <th className="px-6 py-4 font-black cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors" onClick={() => handleSort('status')}>
                  <div className="flex items-center gap-2">{isRTL ? 'الحالة' : 'Status'} {sortBy==='status' && (sortDesc ? <ChevronDown className="w-4 h-4"/> : <ChevronUp className="w-4 h-4"/>)}</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    {isRTL ? 'لا توجد فواتير' : 'No invoices found'}
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                    const due = Number(inv.total || 0) - Number(inv.paid_amount || 0);
                    return (
                  <tr onClick={() => setSelectedInvoice(inv)} key={inv.id} className="bg-white dark:bg-[#1a1a2e] border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer">
                    <td className="px-6 py-4 font-bold text-blue-600 dark:text-blue-400">{inv.invoice_number}</td>
                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-white">{inv.customer?.name || (isRTL ? 'عميل نقدي' : 'Walk-in')}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{format(new Date(inv.invoice_date || inv.created_at), 'yyyy-MM-dd')}</td>
                    <td className="px-6 py-4 font-black text-slate-800 dark:text-white">{formatCurrency(inv.total)}</td>
                    <td className="px-6 py-4 font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(inv.paid_amount || (inv.type==='cash'?inv.total:0))}</td>
                    <td className="px-6 py-4 font-bold text-rose-600 dark:text-rose-400">{formatCurrency(inv.type==='cash'?0:due)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-black tracking-widest uppercase ${
                        inv.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                        inv.status === 'cancelled' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400' :
                        'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                )})
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between print:hidden">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {isRTL ? `إجمالي ${totalItems} فاتورة` : `Total ${totalItems} invoices`}
            </span>
            <div className="flex gap-1">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-50 rounded-lg text-sm font-bold text-slate-700 dark:text-white transition-colors">
                {isRTL ? 'السابق' : 'Prev'}
              </button>
              <span className="px-3 py-1 text-sm font-bold text-slate-700 dark:text-white">
                {page} / {totalPages}
              </span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-50 rounded-lg text-sm font-bold text-slate-700 dark:text-white transition-colors">
                {isRTL ? 'التالي' : 'Next'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm print:bg-white print:p-0 print:block">
          <div className="bg-white dark:bg-[#1a1a2e] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-full print:shadow-none print:h-auto print:max-w-full">
            <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-white/10 print:hidden">
              <h3 className="font-bold text-slate-800 dark:text-white">{isRTL ? 'تفاصيل الفاتورة' : 'Invoice Details'}</h3>
              <div className="flex gap-2">
                <button onClick={() => window.print()} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-slate-500 transition-colors"><Printer className="w-5 h-5"/></button>
                <button onClick={() => setSelectedInvoice(null)} className="p-2 hover:bg-rose-100 dark:hover:bg-rose-500/10 rounded-lg text-slate-500 hover:text-rose-500 transition-colors"><X className="w-5 h-5"/></button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto print:overflow-visible">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-widest">{selectedInvoice.invoice_number}</h1>
                <p className="text-sm text-slate-500 mt-1">{format(new Date(selectedInvoice.invoice_date || selectedInvoice.created_at), 'PPP')}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl">
                  <div className="text-xs text-slate-500 mb-1">{isRTL ? 'العميل' : 'Customer'}</div>
                  <div className="font-bold text-slate-800 dark:text-white">{selectedInvoice.customer?.name || (isRTL ? 'عميل نقدي' : 'Walk-in')}</div>
                  <div className="text-xs text-slate-500">{selectedInvoice.customer?.phone || ''}</div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl">
                  <div className="text-xs text-slate-500 mb-1">{isRTL ? 'حالة الفاتورة' : 'Status'}</div>
                  <div className="font-bold uppercase tracking-widest text-slate-800 dark:text-white">{selectedInvoice.status}</div>
                  <div className="text-xs text-slate-500 mt-1">{isRTL ? 'نوع الدفع:' : 'Type:'} {selectedInvoice.type}</div>
                </div>
              </div>
              
              <table className="w-full text-sm mb-8">
                <thead className="border-b border-slate-200 dark:border-white/10 text-slate-500 text-[10px] uppercase tracking-widest">
                  <tr>
                    <th className="py-2 text-start">{isRTL ? 'المنتج' : 'Item'}</th>
                    <th className="py-2 text-center">{isRTL ? 'الكمية' : 'Qty'}</th>
                    <th className="py-2 text-center">{isRTL ? 'السعر' : 'Price'}</th>
                    <th className="py-2 text-end">{isRTL ? 'الإجمالي' : 'Total'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {selectedInvoice.items?.map((item: any) => (
                    <tr key={item.id}>
                      <td className="py-3 font-bold text-slate-800 dark:text-white">{item.product?.name}</td>
                      <td className="py-3 text-center text-slate-600">{item.quantity}</td>
                      <td className="py-3 text-center text-slate-600">{formatCurrency(item.unit_price)}</td>
                      <td className="py-3 text-end font-bold text-slate-800 dark:text-white">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="space-y-2 border-t border-slate-200 dark:border-white/10 pt-4 w-1/2 ml-auto rtl:mr-auto rtl:ml-0">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{isRTL ? 'المجموع الفرعي' : 'Subtotal'}</span>
                  <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(selectedInvoice.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{isRTL ? 'الضريبة المضافة' : 'VAT'}</span>
                  <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(selectedInvoice.vat_amount)}</span>
                </div>
                <div className="flex justify-between text-lg pt-2 border-t border-slate-100 dark:border-white/5">
                  <span className="font-black text-slate-800 dark:text-white">{isRTL ? 'الإجمالي' : 'Total'}</span>
                  <span className="font-black text-blue-600 dark:text-blue-400">{formatCurrency(selectedInvoice.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
