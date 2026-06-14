'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { partnershipsApi } from '@/lib/api';
import { analyticsApi } from '@/lib/api';

interface Partner {
    id: string;
    name: string;
    capital_amount: number;
    profit_share_percentage: number;
    duration_type: string;
    duration_value: number | null;
    total_pending: number;
    total_withdrawn: number;
}

export default function PartnershipsPage({ params }: { params: { locale: string } }) {
    const isRTL = params.locale === 'ar';
    const [partners, setPartners] = useState<Partner[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showDistributeModal, setShowDistributeModal] = useState(false);
    
    // Add Partner Form
    const [showAddPartnerModal, setShowAddPartnerModal] = useState(false);
    const [partnerName, setPartnerName] = useState('');
    const [partnerCapital, setPartnerCapital] = useState('');
    const [partnerShare, setPartnerShare] = useState('');
    const [durationType, setDurationType] = useState('open'); // open, days, months, years
    const [durationValue, setDurationValue] = useState('');

    // Withdraw Form
    const [withdrawPartner, setWithdrawPartner] = useState<Partner | null>(null);
    const [withdrawAmount, setWithdrawAmount] = useState('');

    // Distribution Form
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [previewData, setPreviewData] = useState<any>(null);

    // AI Forecast Data
    const [aiForecast, setAiForecast] = useState<any>(null);

    useEffect(() => {
        fetchPartners();
    }, []);

    const fetchPartners = async () => {
        try {
            setIsLoading(true);
            const [partnersRes, aiRes] = await Promise.all([
                partnershipsApi.getPartners(),
                analyticsApi.getPartnerForecast().catch(() => ({ data: { data: null } }))
            ]);
            // Data usually wrapped in data.data for pagination
            setPartners(partnersRes.data.data || []);
            setAiForecast(aiRes.data?.data);
        } catch (error) {
            console.error('Error fetching partners', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePreview = async () => {
        if (!startDate || !endDate) return;
        try {
            const { data } = await partnershipsApi.previewDistribution({
                period_start: startDate,
                period_end: endDate
            });
            setPreviewData(data.data);
        } catch (error: any) {
            alert(error.response?.data?.message || 'Error calculating preview');
        }
    };

    const handleDistribute = async () => {
        if (!startDate || !endDate) return;
        try {
            await partnershipsApi.distributeProfits({
                period_start: startDate,
                period_end: endDate
            });
            alert(isRTL ? '✅ تم اعتماد وتوزيع الأرباح بنجاح!' : '✅ Profits distributed and approved successfully!');
            setShowDistributeModal(false);
            fetchPartners(); // Refresh balances
        } catch (error: any) {
            alert(error.response?.data?.message || 'Error distributing profits');
        }
    };

    const handleAddPartner = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await partnershipsApi.createPartner({
                name: partnerName,
                capital_amount: partnerCapital,
                profit_share_percentage: partnerShare,
                duration_type: durationType,
                duration_value: durationType === 'open' ? null : Number(durationValue)
            });
            setShowAddPartnerModal(false);
            setPartnerName('');
            setPartnerCapital('');
            setPartnerShare('');
            setDurationType('open');
            setDurationValue('');
            fetchPartners();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Error adding partner');
        }
    };

    const handleWithdrawal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!withdrawPartner) return;
        try {
            await partnershipsApi.withdrawProfits(withdrawPartner.id, Number(withdrawAmount));
            setWithdrawPartner(null);
            setWithdrawAmount('');
            fetchPartners();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Error withdrawing profits');
        }
    };

    const totalCapital = partners.reduce((sum, p) => sum + Number(p.capital_amount), 0);
    const totalPending = partners.reduce((sum, p) => sum + Number(p.total_pending), 0);
    const totalWithdrawn = partners.reduce((sum, p) => sum + Number(p.total_withdrawn), 0);

    return (
        <div className="space-y-6 animate-fade-in relative max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 p-6 rounded-2xl glass-card border border-primary-500/20">
                <div>
                    <h1 className="text-3xl font-extrabold mb-2" style={{ color: 'var(--text-heading)' }}>
                        {isRTL ? 'إدارة الشراكات والأرباح' : 'Partnerships & Profits'}
                    </h1>
                    <p style={{ color: 'var(--text-muted)' }}>
                        {isRTL ? 'نظام احتساب وتوزيع الأرباح على حسابات الشركاء تلقائياً بناءً على نسبة المضاربة.' : 'Automated profit distribution system based on partnership shares.'}
                    </p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <button onClick={() => setShowAddPartnerModal(true)} className="flex-1 md:flex-none btn-secondary">
                        {isRTL ? '➕ إضافة شريك' : '➕ Add Partner'}
                    </button>
                    <button 
                        onClick={() => setShowDistributeModal(true)}
                        className="flex-1 md:flex-none btn-primary shadow-lg shadow-primary-500/30"
                    >
                        {isRTL ? '💰 توزيع الأرباح' : '💰 Distribute Profits'}
                    </button>
                </div>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: isRTL ? 'رأس مال الشركاء' : 'Partners Capital', value: totalCapital, icon: '🏦', color: 'blue' },
                    { label: isRTL ? 'أرباح قيد الانتظار' : 'Pending Profits', value: totalPending, icon: '⏳', color: 'orange' },
                    { label: isRTL ? 'أرباح إجمالية مسحوبة' : 'Total Withdrawn', value: totalWithdrawn, icon: '💸', color: 'emerald' },
                ].map((stat, i) => (
                    <div key={i} className="p-6 rounded-2xl glass-card flex items-center justify-between border border-default">
                        <div>
                            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
                            <p className="text-3xl font-black" style={{ color: `var(--color-${stat.color}-500, #4f46e5)` }}>
                                {stat.value.toLocaleString()} <span className="text-sm font-normal">ر.س</span>
                            </p>
                        </div>
                        <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl" 
                             style={{ background: `var(--bg-surface-secondary)` }}>
                            {stat.icon}
                        </div>
                    </div>
                ))}
            </div>

            {/* AI End Of Year Projection */}
            {aiForecast?.metrics && (
                <div className="glass-card p-6 rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-500/5 to-indigo-500/5">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-xl">🤖</span>
                        <h2 className="text-lg font-bold text-purple-600 dark:text-purple-400">
                            {isRTL ? 'تنبؤات الذكاء الاصطناعي (نهاية العام)' : 'AI End of Year Projection'}
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="p-4 bg-white/50 dark:bg-black/20 rounded-xl">
                            <p className="text-xs text-muted mb-1">{isRTL ? 'وتيرة الربح اليومية' : 'Daily Profit Velocity'}</p>
                            <p className="font-mono text-lg font-bold text-emerald-500">+{Number(aiForecast.metrics.daily_profit_velocity).toLocaleString()} ر.س</p>
                        </div>
                        <div className="p-4 bg-white/50 dark:bg-black/20 rounded-xl">
                            <p className="text-xs text-muted mb-1">{isRTL ? 'إجمالي الأرباح الحالي' : 'Current Gross Profit'}</p>
                            <p className="font-mono text-lg font-bold">{Number(aiForecast.metrics.current_total_profit).toLocaleString()} ر.س</p>
                        </div>
                        <div className="p-4 bg-white/50 dark:bg-black/20 rounded-xl">
                            <p className="text-xs text-muted mb-1">{isRTL ? 'الأيام المتبقية للسنة' : 'Days Remaining in Year'}</p>
                            <p className="font-mono text-lg font-bold">{aiForecast.metrics.remaining_days}</p>
                        </div>
                        <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                            <p className="text-xs text-purple-600 font-bold mb-1">{isRTL ? 'الإجمالي المتوقع (ديسمبر)' : 'Projected Gross (EOY)'}</p>
                            <p className="font-mono text-xl font-black text-purple-600 dark:text-purple-400">{Number(aiForecast.metrics.projected_total_profit).toLocaleString()} ر.س</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Partners Table */}
            <div className="glass-card rounded-2xl border border-default overflow-hidden">
                <div className="p-6 border-b border-default flex justify-between items-center">
                    <h2 className="text-xl font-bold" style={{ color: 'var(--text-heading)' }}>
                        {isRTL ? 'قائمة الشركاء وحساباتهم الجارية' : 'Partners & Current Accounts'}
                    </h2>
                </div>
                
                {isLoading ? (
                    <div className="p-12 pl-12 text-center text-muted">جاري التحميل...</div>
                ) : partners.length === 0 ? (
                    <div className="p-12 text-center">
                        <span className="text-5xl block mb-4">🪑</span>
                        <p className="font-bold" style={{ color: 'var(--text-heading)' }}>{isRTL ? 'لا يوجد شركاء' : 'No partners found'}</p>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{isRTL ? 'أضف شريكاً للبدء باحتساب الأرباح' : 'Add a partner to start calculating profits'}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-start border-collapse min-w-[800px]">
                            <thead>
                                <tr className="text-xs uppercase tracking-wider" style={{ background: 'var(--bg-surface-secondary)', color: 'var(--text-muted)' }}>
                                    <th className="p-4 rounded-ts-xl">{isRTL ? 'اسم الشريك' : 'Partner Name'}</th>
                                    <th className="p-4">{isRTL ? 'رأس المال' : 'Capital'}</th>
                                    <th className="p-4">{isRTL ? 'نسبة الربح' : 'Profit %'}</th>
                                    <th className="p-4">{isRTL ? 'تنبؤ الإغلاق السنوي (AI)' : 'Projected AI (EOY)'}</th>
                                    <th className="p-4">{isRTL ? 'المدة' : 'Duration'}</th>
                                    <th className="p-4">{isRTL ? 'أرصدة للتحويل (قيد الانتظار)' : 'Pending Credits'}</th>
                                    <th className="p-4 rounded-te-xl end-0 text-end">{isRTL ? 'إجراءات' : 'Actions'}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                {partners.map((partner) => {
                                    const projection = aiForecast?.partner_projections?.find((p: any) => p.partner_id === partner.id);
                                    return (
                                    <tr key={partner.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                        <td className="p-4 font-semibold">{partner.name}</td>
                                        <td className="p-4 font-mono">{Number(partner.capital_amount).toLocaleString()} ر.س</td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 bg-primary-500/10 text-primary-600 rounded-lg text-sm font-bold">
                                                {Number(partner.profit_share_percentage)}%
                                            </span>
                                        </td>
                                        <td className="p-4 font-mono font-bold text-purple-600 dark:text-purple-400">
                                            {projection ? (
                                                <span className="flex items-center gap-1">
                                                    {projection.trajectory_trend === 'up' ? '📈' : '➖'} {Number(projection.projected_eoy_profit).toLocaleString()}
                                                </span>
                                            ) : '---'}
                                        </td>
                                        <td className="p-4 text-sm font-semibold text-muted">
                                            {partner.duration_type === 'open' ? (isRTL ? 'مفتوحة' : 'Open') : 
                                            partner.duration_type === 'days' ? `${partner.duration_value} ${isRTL ? 'أيام' : 'Days'}` : 
                                            partner.duration_type === 'months' ? `${partner.duration_value} ${isRTL ? 'شهور' : 'Months'}` : 
                                            `${partner.duration_value} ${isRTL ? 'سنوات' : 'Years'}`}
                                        </td>
                                        <td className="p-4 font-mono font-bold text-orange-500">{Number(partner.total_pending).toLocaleString()} ر.س</td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-end gap-4">
                                                <Link 
                                                    href={`/${params.locale}/dashboard/partnerships/${partner.id}`}
                                                    className="text-slate-500 hover:text-primary-600 text-sm font-bold transition-colors">
                                                    {isRTL ? '📄 كشف الحساب' : '📄 Ledger Report'}
                                                </Link>
                                                <button 
                                                    onClick={() => setWithdrawPartner(partner)}
                                                    className="text-primary-500 hover:text-primary-600 text-sm font-bold transition-colors">
                                                    {isRTL ? 'صرف الأرباح' : 'Pay Profits'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )})}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Distribute Profits Modal */}
            {showDistributeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-3xl glass-card rounded-3xl border border-default p-0 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        
                        <div className="p-6 border-b border-default bg-gradient-to-r from-primary-500/10 to-transparent flex justify-between items-center">
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                <span>💰</span> {isRTL ? 'أداة احتساب وتوزيع الأرباح' : 'Profit Distribution Engine'}
                            </h2>
                            <button onClick={() => setShowDistributeModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-200 dark:bg-surface-800 hover:bg-red-500 hover:text-white transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6">
                            {/* Date Selection */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold mb-1">{isRTL ? 'تاريخ البداية' : 'Start Date'}</label>
                                    <input type="date" className="input-field w-full" value={startDate} onChange={e => setStartDate(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1">{isRTL ? 'تاريخ النهاية' : 'End Date'}</label>
                                    <input type="date" className="input-field w-full" value={endDate} onChange={e => setEndDate(e.target.value)} />
                                </div>
                            </div>
                            
                            <button onClick={handlePreview} disabled={!startDate || !endDate} className="btn-secondary w-full py-3 border-2 border-primary-500 text-primary-600 font-bold">
                                {isRTL ? '🔄 إجراء حسبة مبدئية (Preview)' : '🔄 Calculate Preview'}
                            </button>

                            {/* Preview Results */}
                            {previewData && (
                                <div className="space-y-4 animate-slide-up mt-6">
                                    <h3 className="font-bold text-lg border-b border-default pb-2">
                                        {isRTL ? 'نتائج الحسبة المحاسبية' : 'Calculation Results'}
                                    </h3>
                                    
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="p-4 rounded-xl bg-surface-100 dark:bg-surface-800 text-center border border-default">
                                            <p className="text-xs text-muted mb-1">{isRTL ? 'إجمالي المبيعات' : 'Total Revenue'}</p>
                                            <p className="text-xl font-bold text-emerald-500">{Number(previewData.total_revenue).toLocaleString()}</p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-surface-100 dark:bg-surface-800 text-center border border-default">
                                            <p className="text-xs text-muted mb-1">{isRTL ? 'إجمالي المصاريف' : 'Total Expenses'}</p>
                                            <p className="text-xl font-bold text-red-500">{Number(previewData.total_expenses).toLocaleString()}</p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-center border border-primary-500/30 shadow-inner">
                                            <p className="text-xs text-primary-600 dark:text-primary-400 font-bold mb-1">{isRTL ? 'صافي الربح المُحقق' : 'Achieved Net Profit'}</p>
                                            <p className="text-2xl font-black text-primary-600 dark:text-primary-400">{Number(previewData.net_profit).toLocaleString()}</p>
                                        </div>
                                    </div>

                                    {!previewData.can_distribute ? (
                                        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 border border-red-200 dark:border-red-500/30 text-sm font-bold flex gap-2">
                                            <span>⚠️</span> {isRTL ? 'لا يمكن توزيع الأرباح، يوجد عجز أو خسارة لهذه الفترة!' : 'Cannot distribute profits, there is a deficit for this period!'}
                                        </div>
                                    ) : (
                                        <div className="border border-default rounded-xl overflow-hidden mt-4">
                                            <table className="w-full text-start">
                                                <thead className="bg-surface-100 dark:bg-surface-800 text-xs">
                                                    <tr>
                                                        <th className="p-3">{isRTL ? 'الجهة المستحقة' : 'Beneficiary'}</th>
                                                        <th className="p-3">{isRTL ? 'النسبة' : 'Share %'}</th>
                                                        <th className="p-3 text-end">{isRTL ? 'المبلغ المستحق' : 'Amount Due'}</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-default">
                                                    {previewData.partner_shares.map((share: any) => (
                                                        <tr key={share.partner_id}>
                                                            <td className="p-3 font-semibold">{share.partner_name}</td>
                                                            <td className="p-3">{Number(share.share_percentage)}%</td>
                                                            <td className="p-3 text-end font-mono font-bold text-emerald-500">+{Number(share.amount).toLocaleString()} ر.س</td>
                                                        </tr>
                                                    ))}
                                                    <tr className="bg-surface-50 dark:bg-surface-900 border-t-2 border-default">
                                                        <td className="p-3 font-bold text-primary-600">{isRTL ? 'نصيب صاحب العمل' : 'Owner Share'}</td>
                                                        <td className="p-3 text-xs italic text-muted">{isRTL ? '(المتبقي)' : '(Remaining)'}</td>
                                                        <td className="p-3 text-end font-mono font-black text-primary-600">+{Number(previewData.owner_business_share).toLocaleString()} ر.س</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-default bg-surface-50 dark:bg-surface-900 flex justify-end gap-3 rounded-b-3xl">
                            <button onClick={() => setShowDistributeModal(false)} className="px-6 py-2 rounded-xl text-sm font-bold border border-default hover:bg-surface-200">
                                {isRTL ? 'إلغاء' : 'Cancel'}
                            </button>
                            <button 
                                onClick={handleDistribute} 
                                disabled={!previewData || !previewData.can_distribute}
                                className="px-8 py-2 rounded-xl text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                            >
                                {isRTL ? '✅ اعتماد وتوزيع نهائي' : '✅ Final Approve & Distribute'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Partner Modal */}
            {showAddPartnerModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-md glass-card rounded-2xl border border-default p-0 shadow-2xl">
                        <div className="p-6 border-b border-default bg-gradient-to-r from-primary-500/10 to-transparent flex justify-between items-center rounded-t-2xl">
                            <h2 className="text-xl font-bold">{isRTL ? 'إضافة شريك جديد' : 'Add New Partner'}</h2>
                            <button onClick={() => setShowAddPartnerModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-200 dark:bg-surface-800 hover:bg-red-500 hover:text-white transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleAddPartner} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-1">{isRTL ? 'اسم الشريك' : 'Partner Name'}</label>
                                <input type="text" required className="input-field w-full" value={partnerName} onChange={e => setPartnerName(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">{isRTL ? 'رأس المال (ر.س)' : 'Capital Amount (SAR)'}</label>
                                <input type="number" required min="0" step="0.01" className="input-field w-full" value={partnerCapital} onChange={e => setPartnerCapital(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">{isRTL ? 'النسبة المئوية للأرباح (%)' : 'Profit Share (%)'}</label>
                                <input type="number" required min="0" max="100" step="0.1" className="input-field w-full" value={partnerShare} onChange={e => setPartnerShare(e.target.value)} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-bold mb-1">{isRTL ? 'نوع المدة' : 'Duration Type'}</label>
                                    <select className="input-field w-full" value={durationType} onChange={e => setDurationType(e.target.value)}>
                                        <option value="open">{isRTL ? 'مفتوحة' : 'Open'}</option>
                                        <option value="days">{isRTL ? 'أيام' : 'Days'}</option>
                                        <option value="months">{isRTL ? 'شهور' : 'Months'}</option>
                                        <option value="years">{isRTL ? 'سنوات' : 'Years'}</option>
                                    </select>
                                </div>
                                {durationType !== 'open' && (
                                    <div>
                                        <label className="block text-sm font-bold mb-1">{isRTL ? 'القيمة' : 'Value'}</label>
                                        <input type="number" required min="1" className="input-field w-full" value={durationValue} onChange={e => setDurationValue(e.target.value)} />
                                    </div>
                                )}
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowAddPartnerModal(false)} className="px-6 py-2 rounded-xl text-sm font-bold border border-default hover:bg-surface-200">
                                    {isRTL ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button type="submit" className="btn-primary">
                                    {isRTL ? 'حفظ الشريك' : 'Save Partner'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Withdraw Modal */}
            {withdrawPartner && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-md glass-card rounded-2xl border border-default p-0 shadow-2xl">
                        <div className="p-6 border-b border-default bg-gradient-to-r from-orange-500/10 to-transparent flex justify-between items-center rounded-t-2xl">
                            <h2 className="text-xl font-bold">{isRTL ? 'صرف أرباح الشريك' : 'Withdraw Profits'}</h2>
                            <button onClick={() => setWithdrawPartner(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-200 dark:bg-surface-800 hover:bg-red-500 hover:text-white transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleWithdrawal} className="p-6 space-y-4">
                            <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl mb-4">
                                <p className="text-sm text-muted">{isRTL ? 'الرصيد المتاح للسحب:' : 'Available Balance:'}</p>
                                <p className="text-2xl font-bold text-orange-500">{Number(withdrawPartner.total_pending).toLocaleString()} ر.س</p>
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">{isRTL ? 'المبلغ المراد صرفه (ر.س)' : 'Withdrawal Amount (SAR)'}</label>
                                <input 
                                    type="number" 
                                    required 
                                    min="1" 
                                    max={withdrawPartner.total_pending} 
                                    step="0.01" 
                                    className="input-field w-full" 
                                    value={withdrawAmount} 
                                    onChange={e => setWithdrawAmount(e.target.value)} 
                                />
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setWithdrawPartner(null)} className="px-6 py-2 rounded-xl text-sm font-bold border border-default hover:bg-surface-200">
                                    {isRTL ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button type="submit" disabled={!withdrawAmount || Number(withdrawAmount) > withdrawPartner.total_pending} className="px-6 py-2 rounded-xl text-sm font-bold bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50">
                                    {isRTL ? 'تأكيد السحب' : 'Confirm Withdrawal'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
