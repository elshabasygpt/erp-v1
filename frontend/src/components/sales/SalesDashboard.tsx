'use client';

import React, { useState, useEffect } from 'react';

import api from '@/lib/api';
import { Card } from '@/components/ui/card';
import { 
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { format } from 'date-fns';
import { Loader2, DollarSign, TrendingUp, TrendingDown, RefreshCcw, AlertCircle } from 'lucide-react';
import { inventoryApi } from '@/lib/api';

export default function SalesDashboard() {
  const isRTL = true;
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<any>({});
  const [charts, setCharts] = useState<any>({});
  const [dateRange, setDateRange] = useState({
      from: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
      to: format(new Date(), 'yyyy-MM-dd')
  });
  const [filters, setFilters] = useState({ branch_id: '', warehouse_id: '' });
  const [branches, setBranches] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    inventoryApi.getBranches().then(res => {
        const data = res.data?.data?.data || res.data?.data || res.data || [];
        setBranches(Array.isArray(data) ? data : []);
    }).catch(() => setBranches([]));
    inventoryApi.getWarehouses().then(res => {
        const data = res.data?.data?.data || res.data?.data || res.data || [];
        setWarehouses(Array.isArray(data) ? data : []);
    }).catch(() => setWarehouses([]));
  }, []);

  useEffect(() => {
    fetchData();
  }, [dateRange, filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [kpiRes, chartRes] = await Promise.all([
        api.get('/sales/advanced-reports/kpis', { params: { date_from: dateRange.from, date_to: dateRange.to, ...filters } }),
        api.get('/sales/advanced-reports/charts', { params: { date_from: dateRange.from, date_to: dateRange.to, ...filters } })
      ]);
      setKpis(kpiRes.data.data);
      setCharts(chartRes.data.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching dashboard data', error);
      setError(isRTL ? 'فشل تحميل بيانات لوحة القياس' : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  if (loading && !kpis.today_sales) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-500"/></div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-64 text-rose-500 gap-2"><AlertCircle className="w-6 h-6"/> {error}</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#1a1a2e] p-4 rounded-2xl border border-slate-200 dark:border-white/10">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white">
            {isRTL ? 'لوحة قياس المبيعات' : 'Sales Dashboard'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-white/50">
            {isRTL ? 'نظرة عامة على أداء المبيعات' : 'Overview of sales performance'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
            <select value={filters.branch_id} onChange={e=>setFilters(p=>({...p, branch_id: e.target.value}))} className="px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white">
                <option value="">{isRTL ? 'كل الفروع' : 'All Branches'}</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select value={filters.warehouse_id} onChange={e=>setFilters(p=>({...p, warehouse_id: e.target.value}))} className="px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white">
                <option value="">{isRTL ? 'كل المستودعات' : 'All Warehouses'}</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <input type="date" value={dateRange.from} onChange={e=>setDateRange(p=>({...p, from: e.target.value}))} className="px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white"/>
              <span className="text-slate-400">-</span>
              <input type="date" value={dateRange.to} onChange={e=>setDateRange(p=>({...p, to: e.target.value}))} className="px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white"/>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: isRTL ? 'مبيعات اليوم' : "Today's Sales", value: kpis.today_sales || 0, icon: DollarSign, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
          { title: isRTL ? 'إجمالي المبيعات' : 'Gross Sales', value: kpis.gross_sales || 0, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { title: isRTL ? 'المرتجعات' : 'Returns', value: kpis.returns || 0, icon: RefreshCcw, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10' },
          { title: isRTL ? 'الخصومات' : 'Discounts', value: kpis.discounts || 0, icon: TrendingDown, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
        ].map((stat, i) => (
          <Card key={i} className="p-5 flex items-center gap-4 bg-white dark:bg-[#1a1a2e] border border-slate-200 dark:border-white/10 hover:border-blue-500/50 transition-colors shadow-sm">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 dark:text-white/50">{stat.title}</p>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white">{Number(stat.value).toLocaleString()} <span className="text-sm font-medium text-slate-400">{isRTL ? 'ر.س' : 'SAR'}</span></h3>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5 bg-white dark:bg-[#1a1a2e] border border-slate-200 dark:border-white/10 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">{isRTL ? 'اتجاه المبيعات' : 'Sales Trend'}</h3>
            <div className="h-72 w-full">
                <ResponsiveContainer>
                    <BarChart data={charts.sales_trend}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--tw-bg-opacity)' }}/>
                        <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>

        <Card className="p-5 bg-white dark:bg-[#1a1a2e] border border-slate-200 dark:border-white/10 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">{isRTL ? 'طرق الدفع' : 'Payment Methods'}</h3>
            <div className="h-72 w-full">
                <ResponsiveContainer>
                    <PieChart>
                        <Pie data={charts.payment_methods} dataKey="total" nameKey="type" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5}>
                            {charts.payment_methods?.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </Card>
      </div>
    </div>
  );
}
