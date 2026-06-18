'use client';

import React from 'react';
import { useSalesDashboard } from './hooks/useSalesDashboard';
import { Card } from '@/components/ui/card';
import { 
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Line, RadialBarChart, RadialBar
} from 'recharts';
import { format } from 'date-fns';
import { Loader2, DollarSign, TrendingUp, TrendingDown, RefreshCcw, AlertCircle, ShoppingBag, Users, FileText, Target, Trophy, Store } from 'lucide-react';
import { inventoryApi } from '@/lib/api';

export default function SalesDashboard() {
  const isRTL = true;
  const { 
    loading, kpis, charts, 
    dateRange, setDateRange, 
    filters, setFilters, 
    branches, warehouses, error 
  } = useSalesDashboard(isRTL);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  if (loading && !kpis.today_sales) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-500"/></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {error && (
        <div className="flex items-center gap-2 p-4 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-200 dark:border-rose-500/20 mb-4">
          <AlertCircle className="w-5 h-5"/>
          <span className="text-sm font-bold">{error}</span>
        </div>
      )}
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
          { title: isRTL ? 'إجمالي المبيعات' : 'Gross Sales', value: kpis.gross_sales || 0, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', trend: kpis.trends?.gross_sales },
          { title: isRTL ? 'صافي الربح' : 'Net Profit', value: kpis.net_profit || 0, icon: DollarSign, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10', trend: kpis.trends?.net_profit },
          { title: isRTL ? 'متوسط الفاتورة' : 'Avg Order Value', value: kpis.average_order_value || 0, icon: ShoppingBag, color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-500/10' },
          { title: isRTL ? 'المرتجعات' : 'Returns', value: kpis.returns || 0, icon: RefreshCcw, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10' },
          { title: isRTL ? 'الخصومات' : 'Discounts', value: kpis.discounts || 0, icon: TrendingDown, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
          { title: isRTL ? 'ديون غير محصلة' : 'Unpaid Invoices', value: kpis.unpaid_invoices || 0, icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-500/10' },
          { title: isRTL ? 'الهدف الشهري' : 'Monthly Target', value: kpis.sales_target || 0, icon: Target, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
        ].map((stat, i) => (
          <Card key={i} className="p-5 flex items-center gap-4 bg-white dark:bg-[#1a1a2e] border border-slate-200 dark:border-white/10 hover:border-blue-500/50 transition-colors shadow-sm relative overflow-hidden">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-500 dark:text-white/50">{stat.title}</p>
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-black text-slate-800 dark:text-white">{Number(stat.value).toLocaleString()} <span className="text-sm font-medium text-slate-400">{isRTL ? 'ر.س' : 'SAR'}</span></h3>
                {stat.trend !== undefined && (
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${stat.trend >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'}`}>
                    {stat.trend >= 0 ? '+' : ''}{stat.trend}%
                  </span>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="p-5 bg-white dark:bg-[#1a1a2e] border border-slate-200 dark:border-white/10 shadow-sm col-span-1 lg:col-span-2">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">{isRTL ? 'اتجاه المبيعات وهامش الربح' : 'Sales & Profit Trend'}</h3>
            <div className="h-72 w-full">
                <ResponsiveContainer>
                    <ComposedChart data={charts.sales_trend || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                        <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                        <YAxis yAxisId="right" orientation={isRTL ? "left" : "right"} axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--tw-bg-opacity)' }}/>
                        <Legend />
                        <Bar yAxisId="left" dataKey="total" name={isRTL ? "المبيعات" : "Sales"} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Line yAxisId="right" type="monotone" dataKey="profit_margin" name={isRTL ? "هامش الربح %" : "Profit Margin %"} stroke="#8b5cf6" strokeWidth={3} dot={{r:4}} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </Card>

        <Card className="p-5 bg-white dark:bg-[#1a1a2e] border border-slate-200 dark:border-white/10 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">{isRTL ? 'إنجاز الهدف الشهري' : 'Monthly Target Progress'}</h3>
            <div className="h-72 w-full flex flex-col items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart 
                        cx="50%" cy="50%" 
                        innerRadius="70%" outerRadius="100%" 
                        barSize={20} 
                        data={[{ name: 'Progress', value: Math.min(((kpis.net_sales || 0) / (kpis.sales_target || 1)) * 100, 100), fill: '#10b981' }]} 
                        startAngle={180} endAngle={0}
                    >
                        <RadialBar background dataKey="value" cornerRadius={10} />
                    </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute top-[60%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center w-full">
                    <span className="text-4xl font-black text-slate-800 dark:text-white">{Math.round(((kpis.net_sales || 0) / (kpis.sales_target || 1)) * 100)}%</span>
                    <p className="text-sm font-medium text-slate-500 mt-2">{isRTL ? 'محقق من الهدف' : 'of Target Achieved'}</p>
                </div>
            </div>
        </Card>

        <Card className="p-5 bg-white dark:bg-[#1a1a2e] border border-slate-200 dark:border-white/10 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">{isRTL ? 'طرق الدفع' : 'Payment Methods'}</h3>
            <div className="h-72 w-full">
                <ResponsiveContainer>
                    <PieChart>
                        <Pie data={charts.payment_methods || []} dataKey="total" nameKey="type" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5}>
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

        <Card className="p-5 bg-white dark:bg-[#1a1a2e] border border-slate-200 dark:border-white/10 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">{isRTL ? 'مبيعات الفروع' : 'Sales by Branch'}</h3>
            <div className="h-72 w-full">
                <ResponsiveContainer>
                    <BarChart data={charts.sales_by_branch || []} layout="vertical" margin={{ left: 0, right: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#334155" opacity={0.2} />
                        <XAxis type="number" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                        <YAxis type="category" dataKey="branch_name" axisLine={false} tickLine={false} tick={{fontSize: 12}} width={90} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="total" name={isRTL ? "المبيعات" : "Sales"} fill="#f59e0b" radius={isRTL ? [4, 0, 0, 4] : [0, 4, 4, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>

        <Card className="p-5 bg-white dark:bg-[#1a1a2e] border border-slate-200 dark:border-white/10 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">{isRTL ? 'ولاء العملاء' : 'Customer Retention'}</h3>
            <div className="h-72 w-full">
                <ResponsiveContainer>
                    <PieChart>
                        <Pie data={charts.customer_retention || []} dataKey="total" nameKey="type" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5}>
                            {charts.customer_retention?.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6'][index % 2]} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-5 bg-white dark:bg-[#1a1a2e] border border-slate-200 dark:border-white/10 shadow-sm col-span-1 lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-500" />
                    {isRTL ? 'أحدث الفواتير' : 'Recent Invoices'}
                </h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left rtl:text-right">
                    <thead className="text-xs text-slate-500 bg-slate-50 dark:bg-white/5 dark:text-slate-400 uppercase">
                        <tr>
                            <th className="px-4 py-3 rounded-s-lg">{isRTL ? 'رقم الفاتورة' : 'Invoice No.'}</th>
                            <th className="px-4 py-3">{isRTL ? 'العميل' : 'Customer'}</th>
                            <th className="px-4 py-3">{isRTL ? 'المبلغ' : 'Amount'}</th>
                            <th className="px-4 py-3">{isRTL ? 'الحالة' : 'Status'}</th>
                            <th className="px-4 py-3 rounded-e-lg">{isRTL ? 'التاريخ' : 'Date'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {charts.recent_invoices?.map((invoice: any) => (
                            <tr key={invoice.id} className="border-b border-slate-100 dark:border-white/5 last:border-0">
                                <td className="px-4 py-3 font-medium">{invoice.invoice_number}</td>
                                <td className="px-4 py-3">{invoice.customer_name || '-'}</td>
                                <td className="px-4 py-3 font-bold">{Number(invoice.total).toLocaleString()} {isRTL ? 'ر.س' : 'SAR'}</td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-1 text-xs rounded-full ${invoice.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400'}`}>
                                        {invoice.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-slate-500">{invoice.invoice_date?.split('T')?.[0]}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {!charts.recent_invoices?.length && (
                    <div className="p-8 text-center text-slate-500">{isRTL ? 'لا توجد بيانات' : 'No data available'}</div>
                )}
            </div>
        </Card>

        <div className="flex flex-col gap-6">
            <Card className="p-5 bg-white dark:bg-[#1a1a2e] border border-slate-200 dark:border-white/10 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-indigo-500" />
                    {isRTL ? 'أفضل المنتجات' : 'Top Products'}
                </h3>
                <div className="space-y-4">
                    {charts.top_products?.map((product: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between">
                            <div>
                                <p className="font-bold text-slate-800 dark:text-white line-clamp-1">{isRTL ? product.name_ar : product.name}</p>
                                <p className="text-xs text-slate-500">{product.total_quantity} {isRTL ? 'وحدة' : 'units'}</p>
                            </div>
                            <div className="font-bold text-emerald-600 dark:text-emerald-400">
                                {Number(product.total_revenue).toLocaleString()} <span className="text-xs">ر.س</span>
                            </div>
                        </div>
                    ))}
                    {!charts.top_products?.length && (
                        <div className="text-center text-slate-500">{isRTL ? 'لا توجد بيانات' : 'No data available'}</div>
                    )}
                </div>
            </Card>

            <Card className="p-5 bg-white dark:bg-[#1a1a2e] border border-slate-200 dark:border-white/10 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                    <Users className="w-5 h-5 text-fuchsia-500" />
                    {isRTL ? 'أفضل العملاء' : 'Top Customers'}
                </h3>
                <div className="space-y-4">
                    {charts.top_customers?.map((customer: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between">
                            <p className="font-bold text-slate-800 dark:text-white line-clamp-1">{customer.name}</p>
                            <div className="font-bold text-blue-600 dark:text-blue-400">
                                {Number(customer.total_revenue).toLocaleString()} <span className="text-xs">ر.س</span>
                            </div>
                        </div>
                    ))}
                    {!charts.top_customers?.length && (
                        <div className="text-center text-slate-500">{isRTL ? 'لا توجد بيانات' : 'No data available'}</div>
                    )}
                </div>
            </Card>
        </div>
      </div>
    </div>
  );
}
