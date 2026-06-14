'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { partnershipsApi } from '@/lib/api';
import * as XLSX from 'xlsx';

export default function PartnerReportPage({ params }: { params: { locale: string, id: string } }) {
    const isRTL = params.locale === 'ar';
    const [partner, setPartner] = useState<any>(null);
    const [ledger, setLedger] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchPartnerData = async () => {
            try {
                const { data } = await partnershipsApi.getPartner(params.id);
                const partnerData = data.data;
                setPartner(partnerData);

                // Unify Profit Shares and Withdrawals into a single Ledger array
                const profits = (partnerData.profit_shares || []).map((p: any) => ({
                    id: `p-${p.id}`,
                    type: 'profit',
                    amount: Number(p.amount),
                    date: new Date(p.created_at),
                    description: isRTL 
                        ? `حصة أرباح لدورة (${p.distribution?.period_start} إلى ${p.distribution?.period_end})` 
                        : `Profit share for period (${p.distribution?.period_start} to ${p.distribution?.period_end})`
                }));

                const withdrawals = (partnerData.withdrawals || []).map((w: any) => ({
                    id: `w-${w.id}`,
                    type: 'withdrawal',
                    amount: Number(w.amount),
                    date: new Date(w.created_at),
                    description: w.notes || (isRTL ? 'سحب أرباح' : 'Profit Withdrawal')
                }));

                const combined = [...profits, ...withdrawals].sort((a, b) => b.date.getTime() - a.date.getTime());
                setLedger(combined);
            } catch (error) {
                console.error("Error loading partner report", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPartnerData();
    }, [params.id, isRTL]);

    if (isLoading) {
        return <div className="p-12 text-center font-bold animate-pulse text-primary-500">{isRTL ? 'جاري تجهيز التقرير...' : 'Loading Report...'}</div>;
    }

    if (!partner) {
        return <div className="p-12 text-center text-red-500">{isRTL ? 'تعذر العثور على الشريك' : 'Partner not found'}</div>;
    }

    const totalEarned = (partner.profit_shares || []).reduce((sum: number, p: any) => sum + Number(p.amount), 0);

    const handleExportExcel = () => {
        if (ledger.length === 0) {
            alert(isRTL ? 'لا توجد بيانات لتصديرها!' : 'No data to export!');
            return;
        }

        const dataForExcel = ledger.map(item => ({
            [isRTL ? 'التاريخ والوقت' : 'Date & Time']: `${item.date.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')} - ${item.date.toLocaleTimeString(isRTL ? 'ar-SA' : 'en-US', {hour: '2-digit', minute:'2-digit'})}`,
            [isRTL ? 'نوع الحركة' : 'Transaction Type']: item.type === 'profit' ? (isRTL ? 'إيداع أرباح' : 'Profit Deposit') : (isRTL ? 'سحب نقدي' : 'Cash Withdrawal'),
            [isRTL ? 'البيان' : 'Description']: item.description,
            [isRTL ? 'القيمة' : 'Amount']: item.type === 'profit' ? Number(item.amount) : -Number(item.amount)
        }));

        const ws = XLSX.utils.json_to_sheet(dataForExcel);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, isRTL ? 'كشف الحساب' : 'Ledger');
        XLSX.writeFile(wb, `${partner.name.replace(/\s+/g, '_')}_Ledger.xlsx`);
    };

    return (
        <div className="space-y-6 animate-fade-in relative max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 rounded-2xl glass-card border border-primary-500/20 bg-gradient-to-r from-primary-500/5 to-transparent">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary-500/10 flex items-center justify-center text-3xl">
                        👤
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold mb-1 shadow-sm" style={{ color: 'var(--text-heading)' }}>
                            {partner.name}
                        </h1>
                        <p className="text-sm rounded bg-surface-200 px-2 py-1 inline-block font-mono" style={{ color: 'var(--text-secondary)' }}>
                            {isRTL ? 'رقم الشريك:' : 'Partner ID:'} {partner.id.split('-')[0].toUpperCase()}
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Link href={`/${params.locale}/dashboard/partnerships`} className="btn-secondary px-6">
                        {isRTL ? '🔙 العودة' : '🔙 Back'}
                    </Link>
                    <button onClick={handleExportExcel} className="btn-secondary flex items-center gap-2 border border-emerald-500/30 hover:bg-emerald-50 text-emerald-600 dark:hover:bg-emerald-900/20">
                        📊 {isRTL ? 'تصدير إكسيل' : 'Export Excel'}
                    </button>
                    <button onClick={() => window.print()} className="btn-primary flex items-center gap-2 shadow-lg shadow-primary-500/30">
                        🖨️ {isRTL ? 'طباعة الكشف' : 'Print Ledger'}
                    </button>
                </div>
            </div>

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl glass-card border border-default">
                    <p className="text-xs text-muted mb-1 font-bold">{isRTL ? 'رأس المال المودع' : 'Invested Capital'}</p>
                    <p className="text-2xl font-black text-primary-600">{Number(partner.capital_amount).toLocaleString()} <span className="text-sm font-normal">ر.س</span></p>
                </div>
                <div className="p-5 rounded-2xl glass-card border border-default bg-emerald-500/5">
                    <p className="text-xs text-muted mb-1 font-bold">{isRTL ? 'إجمالي الأرباح المكتسبة' : 'Total Profits Earned'}</p>
                    <p className="text-2xl font-black text-emerald-600">+{totalEarned.toLocaleString()} <span className="text-sm font-normal">ر.س</span></p>
                </div>
                <div className="p-5 rounded-2xl glass-card border border-default bg-orange-500/5">
                    <p className="text-xs text-muted mb-1 font-bold">{isRTL ? 'إجمالي المبالغ المسحوبة' : 'Total Withdrawn'}</p>
                    <p className="text-2xl font-black text-orange-600">-{Number(partner.total_withdrawn).toLocaleString()} <span className="text-sm font-normal">ر.س</span></p>
                </div>
                <div className="p-5 rounded-2xl glass-card shadow-inner border border-primary-500/30 bg-primary-500/10 dark:bg-primary-900/20">
                    <p className="text-xs text-primary-600 mb-1 font-bold">{isRTL ? 'الرصيد المعلق (أرباح لم تُسحب)' : 'Pending Balance'}</p>
                    <p className="text-3xl font-black text-primary-600 dark:text-primary-400">{Number(partner.total_pending).toLocaleString()} <span className="text-sm font-normal">ر.س</span></p>
                </div>
            </div>

            {/* Ledger Table */}
            <div className="glass-card rounded-2xl border border-default overflow-hidden">
                <div className="p-5 border-b border-default bg-surface-50 dark:bg-surface-900 flex justify-between items-center">
                    <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-heading)' }}>
                        📅 {isRTL ? 'كشف الحساب التاريخي (Ledger)' : 'Historical Ledger'}
                    </h2>
                    <span className="text-sm font-bold bg-primary-500/10 text-primary-600 px-3 py-1 rounded-lg">
                        {isRTL ? 'حصة الشراكة:' : 'Profit Share:'} {partner.profit_share_percentage}%
                    </span>
                </div>

                {ledger.length === 0 ? (
                    <div className="p-16 text-center text-muted">
                        <div className="text-4xl mb-3">📭</div>
                        <p>{isRTL ? 'لا توجد أي حركات مالية مسجلة لهذا الشريك حتى الآن.' : 'No financial transactions recorded yet.'}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-start">
                            <thead className="bg-surface-100 dark:bg-surface-800 text-xs">
                                <tr>
                                    <th className="p-4 rounded-ts-xl">{isRTL ? 'التاريخ والوقت' : 'Date & Time'}</th>
                                    <th className="p-4">{isRTL ? 'نوع الحركة' : 'Transaction Type'}</th>
                                    <th className="p-4">{isRTL ? 'البيان' : 'Description'}</th>
                                    <th className="p-4 text-end rounded-te-xl">{isRTL ? 'القيمة (ر.س)' : 'Amount (SAR)'}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-default">
                                {ledger.map((item) => (
                                    <tr key={item.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                        <td className="p-4 text-sm font-mono text-muted">
                                            {item.date.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')} - {item.date.toLocaleTimeString(isRTL ? 'ar-SA' : 'en-US', {hour: '2-digit', minute:'2-digit'})}
                                        </td>
                                        <td className="p-4">
                                            {item.type === 'profit' ? (
                                                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-600 rounded text-xs font-bold whitespace-nowrap">
                                                    {isRTL ? 'إيداع أرباح' : 'Profit Deposit'}
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 bg-orange-500/10 text-orange-600 rounded text-xs font-bold whitespace-nowrap">
                                                    {isRTL ? 'سحب نقدي' : 'Cash Withdrawal'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-sm font-semibold truncate max-w-xs">{item.description}</td>
                                        <td className={`p-4 text-end font-mono font-black ${item.type === 'profit' ? 'text-emerald-500' : 'text-orange-500'}`}>
                                            {item.type === 'profit' ? '+' : '-'}{item.amount.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            
            <style jsx global>{`
                @media print {
                    .btn-primary, .btn-secondary, nav, aside { display: none !important; }
                    .glass-card { box-shadow: none !important; border: 1px solid #ccc !important; }
                    body { background: white !important; color: black !important; }
                }
            `}</style>
        </div>
    );
}
