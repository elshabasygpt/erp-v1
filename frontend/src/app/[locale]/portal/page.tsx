'use client';

import { usePartnerPolling } from '@/hooks/usePartnerPolling';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const GoldCard = ({ icon, label, value, sub, color = '#ffd700' }: any) => (
    <div className="rounded-2xl p-5 relative overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,215,0,0.12)', backdropFilter: 'blur(10px)' }}>
        <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.2)' }}>
                {icon}
            </div>
            {sub && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: sub > 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: sub > 0 ? '#34d399' : '#f87171' }}>
                    {sub > 0 ? '+' : ''}{sub}%
                </span>
            )}
        </div>
        <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</p>
        <p className="text-2xl font-black" style={{ color }}>{value}</p>
    </div>
);

export default function PortalDashboard({ params }: { params: { locale: string } }) {
    const isRTL = params.locale === 'ar';
    const { data, isLoading, error, lastUpdated, refresh } = usePartnerPolling(60000);

    const fmt = (n: number) => Number(n || 0).toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-64 gap-4">
            <div className="w-14 h-14 rounded-full border-2 border-yellow-400 border-t-transparent animate-spin" />
            <p className="text-sm" style={{ color: 'rgba(255,215,0,0.6)' }}>{isRTL ? 'جاري تحميل بياناتك...' : 'Loading your data...'}</p>
        </div>
    );

    const kpis = data?.kpis;
    const profits = data?.profits;
    const statement = data?.statement;
    const topProducts = data?.topProducts ?? [];
    const forecast = data?.forecast;

    return (
        <div className="space-y-8" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-white">
                        {isRTL ? '📊 لوحة تحكمك المالية' : '📊 Financial Dashboard'}
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {isRTL ? 'بيانات محدّثة كل دقيقة تلقائياً' : 'Auto-refreshes every minute'}
                        {lastUpdated && ` · ${isRTL ? 'آخر تحديث' : 'Last update'}: ${lastUpdated.toLocaleTimeString()}`}
                    </p>
                </div>
                <button onClick={refresh}
                    className="text-xs px-4 py-2 rounded-xl transition-all hover:opacity-80 flex items-center gap-1.5"
                    style={{ background: 'rgba(255,215,0,0.1)', color: '#ffd700', border: '1px solid rgba(255,215,0,0.2)' }}>
                    🔄 {isRTL ? 'تحديث' : 'Refresh'}
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <GoldCard icon="💰" label={isRTL ? 'مبيعات اليوم' : "Today's Sales"} value={`${fmt(kpis?.today_sales)} ر.س`} sub={kpis?.sales_growth_pct} />
                <GoldCard icon="📈" label={isRTL ? 'نصيبك اليوم' : 'Your Share Today'} value={`${fmt(kpis?.partner_today_profit)} ر.س`} color="#34d399" />
                <GoldCard icon="⏳" label={isRTL ? 'الرصيد المعلق' : 'Pending Balance'} value={`${fmt(kpis?.total_pending)} ر.س`} color="#60a5fa" />
                <GoldCard icon="💵" label={isRTL ? 'إجمالي المسحوبات' : 'Total Withdrawn'} value={`${fmt(kpis?.total_withdrawn)} ر.س`} color="#c4b5fd" />
            </div>

            {/* Profits Chart */}
            <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,215,0,0.12)' }}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="font-bold text-white text-lg">
                        {isRTL ? '📈 أرباحك الشهرية (آخر 6 أشهر)' : '📈 Monthly Profits (Last 6 Months)'}
                    </h2>
                    <div className="text-sm" style={{ color: '#ffd700' }}>
                        {isRTL ? `نمو ${profits?.growth_pct ?? 0}%` : `Growth ${profits?.growth_pct ?? 0}%`}
                    </div>
                </div>
                <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={profits?.chart_data ?? []}>
                            <defs>
                                <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ffd700" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#ffd700" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey={isRTL ? 'month_ar' : 'month'} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <Tooltip
                                contentStyle={{ background: '#1a1040', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 8, color: '#fff' }}
                                formatter={(v: any) => [`${Number(v).toLocaleString()} ر.س`, isRTL ? 'حصتك' : 'Your share']}
                            />
                            <Area type="monotone" dataKey="partner_profit" stroke="#ffd700" fill="url(#goldGrad)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Statement + Top Products */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Statement */}
                <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,215,0,0.12)' }}>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-bold text-white">{isRTL ? '📋 كشف الحساب' : '📋 Account Statement'}</h2>
                        <button
                            onClick={async (e) => {
                                const btn = e.currentTarget;
                                const originalText = btn.innerHTML;
                                btn.innerHTML = isRTL ? '⏳ جاري التجهيز...' : '⏳ Preparing...';
                                btn.disabled = true;
                                try {
                                    const { portalDataApi } = await import('@/lib/portal-api');
                                    await portalDataApi.downloadStatementPdf();
                                } catch (err) {
                                    alert(isRTL ? 'فشل تحميل الملف' : 'Download failed');
                                } finally {
                                    btn.innerHTML = originalText;
                                    btn.disabled = false;
                                }
                            }}
                            className="text-xs px-3 py-1.5 rounded-lg"
                            style={{ background: 'rgba(255,215,0,0.1)', color: '#ffd700', border: '1px solid rgba(255,215,0,0.2)' }}
                        >
                            📥 {isRTL ? 'تصدير PDF' : 'Export PDF'}
                        </button>
                    </div>

                    {/* Summary row */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        {[
                            { l: isRTL ? 'إجمالي الدائن' : 'Total Credits', v: statement?.summary?.total_credited },
                            { l: isRTL ? 'المسحوب' : 'Withdrawn', v: statement?.summary?.total_withdrawn },
                            { l: isRTL ? 'الرصيد' : 'Balance', v: statement?.summary?.current_balance },
                        ].map((s, i) => (
                            <div key={i} className="p-2 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                                <p className="text-[10px] mb-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.l}</p>
                                <p className="text-sm font-bold" style={{ color: '#ffd700' }}>{fmt(s.v)} ر.س</p>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-1.5 max-h-56 overflow-y-auto">
                        {statement?.entries?.slice(0, 8).map((entry: any, i: number) => (
                            <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg"
                                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-white truncate">{entry.description}</p>
                                    <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{entry.date}</p>
                                </div>
                                <span className="text-xs font-bold ms-2" style={{ color: entry.type === 'credit' ? '#34d399' : '#f87171' }}>
                                    {entry.type === 'credit' ? '+' : '-'}{fmt(entry.amount)}
                                </span>
                            </div>
                        ))}
                        {!statement?.entries?.length && (
                            <p className="text-center py-6 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                {isRTL ? 'لا توجد حركات بعد' : 'No transactions yet'}
                            </p>
                        )}
                    </div>
                </div>

                {/* Top Products */}
                <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,215,0,0.12)' }}>
                    <h2 className="font-bold text-white mb-4">{isRTL ? '🏆 أفضل المنتجات مبيعاً' : '🏆 Top Products'}</h2>
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                        {topProducts.slice(0, 8).map((p: any, i: number) => (
                            <div key={p.id} className="flex items-center gap-3 py-2 px-3 rounded-xl"
                                style={{ background: 'rgba(255,255,255,0.03)' }}>
                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0"
                                    style={{ background: i < 3 ? 'linear-gradient(135deg, #ffd700, #b8860b)' : 'rgba(255,255,255,0.1)', color: i < 3 ? '#1a1a2e' : '#fff' }}>
                                    {i + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-white truncate">{isRTL ? p.name_ar || p.name : p.name}</p>
                                    <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                        {isRTL ? `${p.total_qty} وحدة` : `${p.total_qty} units`}
                                    </p>
                                </div>
                                <span className="text-xs font-bold" style={{ color: '#ffd700' }}>{fmt(p.total_revenue)} ر.س</span>
                            </div>
                        ))}
                        {!topProducts.length && (
                            <p className="text-center py-8 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                {isRTL ? 'لا توجد بيانات مبيعات بعد' : 'No sales data yet'}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* AI Forecast */}
            {forecast?.projection && (
                <div className="rounded-2xl p-6" style={{ background: 'rgba(255,215,0,0.04)', border: '1px solid rgba(255,215,0,0.25)' }}>
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-xl">🤖</span>
                        <h2 className="font-bold text-lg" style={{ color: '#ffd700' }}>
                            {isRTL ? 'تنبؤات نهاية العام (AI)' : 'AI End-of-Year Forecast'}
                        </h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { l: isRTL ? 'حصتك المتوقعة' : 'Your Projected Share', v: fmt(forecast.projection.projected_eoy_profit), main: true },
                            { l: isRTL ? 'وتيرة ربح النظام/يوم' : 'Daily System Profit', v: `+${fmt(forecast.metrics?.daily_profit_velocity)} ر.س` },
                            { l: isRTL ? 'الأيام المتبقية' : 'Days Remaining', v: forecast.metrics?.remaining_days },
                            { l: isRTL ? 'الاتجاه' : 'Trajectory', v: forecast.projection.trajectory_trend === 'up' ? '📈 صاعد' : '➖ مستقر' },
                        ].map((s, i) => (
                            <div key={i} className="p-4 rounded-xl text-center" style={{ background: s.main ? 'rgba(255,215,0,0.1)' : 'rgba(255,255,255,0.04)', border: s.main ? '1px solid rgba(255,215,0,0.3)' : 'none' }}>
                                <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.l}</p>
                                <p className="text-lg font-black" style={{ color: s.main ? '#ffd700' : '#fff' }}>{s.v}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
