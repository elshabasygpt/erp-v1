'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { salesApi } from '@/lib/api';
import WarrantyDetailModal from './WarrantyDetailModal';
import ClaimModal from './ClaimModal';

export default function WarrantyContent({ dict, locale }: { dict: any; locale: string }) {
    const isRTL = locale === 'ar';
    const queryClient = useQueryClient();

    // Filters
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'claimed' | 'void'>('all');
    const [expiringFilter, setExpiringFilter] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');

    const [selectedWarranty, setSelectedWarranty] = useState<any>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    const [claimWarranty, setClaimWarranty] = useState<any>(null);
    const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);

    const { data: report } = useQuery({
        queryKey: ['warranties', 'report'],
        queryFn: async () => {
            const res = await salesApi.getWarrantiesReport();
            return res.data?.data;
        },
    });

    const { data: warranties = [], isLoading: loading } = useQuery<any[]>({
        queryKey: ['warranties', 'list', { statusFilter, expiringFilter, searchQuery }],
        queryFn: async () => {
            const params: any = {};
            if (statusFilter !== 'all') params.status = statusFilter;
            if (expiringFilter) params.expiring_in_days = parseInt(expiringFilter);
            if (searchQuery) params.search = searchQuery;

            const res = await salesApi.getWarranties(params);
            return res.data?.data?.data || [];
        },
    });

    const loadData = () => {
        queryClient.invalidateQueries({ queryKey: ['warranties'] });
    };

    const handleOpenClaim = (w: any) => {
        setClaimWarranty(w);
        setIsClaimModalOpen(true);
        setIsDetailModalOpen(false);
    };

    const handleOpenDetail = async (w: any) => {
        try {
            const res = await salesApi.getWarranty(w.id);
            setSelectedWarranty(res.data?.data);
            setIsDetailModalOpen(true);
        } catch (error) {

        }
    };

    return (
        <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        {isRTL ? 'إدارة الضمانات' : 'Warranty Management'}
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        {isRTL ? 'تتبع فترات الضمان، المطالبات، والقطع المستبدلة' : 'Track warranty periods, claims, and replacements'}
                    </p>
                </div>
            </div>

            {/* KPI Cards */}
            {report && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl shadow-sm border flex items-center justify-between" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
                        <div>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{isRTL ? 'ضمانات نشطة' : 'Active Warranties'}</p>
                            <h3 className="text-2xl font-bold mt-1 text-green-600">{report.summary.total_active}</h3>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xl">🛡️</div>
                    </div>
                    <div className="p-4 rounded-xl shadow-sm border flex items-center justify-between" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
                        <div>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{isRTL ? 'تنتهي هذا الشهر' : 'Expiring This Month'}</p>
                            <h3 className="text-2xl font-bold mt-1 text-orange-500">{report.summary.expiring_this_month}</h3>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 text-xl">⏳</div>
                    </div>
                    <div className="p-4 rounded-xl shadow-sm border flex items-center justify-between" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
                        <div>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{isRTL ? 'مطالبات مفتوحة' : 'Open Claims'}</p>
                            <h3 className="text-2xl font-bold mt-1 text-red-500">{report.summary.open_claims}</h3>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-500 text-xl">⚠️</div>
                    </div>
                    <div className="p-4 rounded-xl shadow-sm border flex items-center justify-between" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
                        <div>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{isRTL ? 'ضمانات منتهية' : 'Expired Warranties'}</p>
                            <h3 className="text-2xl font-bold mt-1 text-gray-500">{report.summary.expired_unclaimed}</h3>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xl">⚫</div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="p-4 rounded-xl shadow-sm border space-y-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder={isRTL ? "بحث برقم الضمان أو اسم العميل..." : "Search by warranty number or customer..."}
                            className="input-field w-full"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <select
                        className="select-field w-full md:w-48"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                    >
                        <option value="all">{isRTL ? 'كل الحالات' : 'All Statuses'}</option>
                        <option value="active">{isRTL ? 'نشط' : 'Active'}</option>
                        <option value="expired">{isRTL ? 'منتهي' : 'Expired'}</option>
                        <option value="claimed">{isRTL ? 'مطالب به' : 'Claimed'}</option>
                        <option value="void">{isRTL ? 'ملغي' : 'Void'}</option>
                    </select>
                    <select
                        className="select-field w-full md:w-48"
                        value={expiringFilter}
                        onChange={(e) => setExpiringFilter(e.target.value)}
                    >
                        <option value="">{isRTL ? 'المدة المتبقية' : 'Remaining Time'}</option>
                        <option value="30">{isRTL ? 'خلال 30 يوم' : 'Within 30 Days'}</option>
                        <option value="60">{isRTL ? 'خلال 60 يوم' : 'Within 60 Days'}</option>
                        <option value="90">{isRTL ? 'خلال 90 يوم' : 'Within 90 Days'}</option>
                    </select>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left" style={{ color: 'var(--text-primary)' }}>
                        <thead>
                            <tr className="border-b" style={{ borderColor: 'var(--border-default)' }}>
                                <th className="p-3 font-semibold text-sm">{isRTL ? 'رقم الضمان' : 'Warranty No'}</th>
                                <th className="p-3 font-semibold text-sm">{isRTL ? 'المنتج' : 'Product'}</th>
                                <th className="p-3 font-semibold text-sm">{isRTL ? 'العميل' : 'Customer'}</th>
                                <th className="p-3 font-semibold text-sm">{isRTL ? 'تاريخ البيع' : 'Sale Date'}</th>
                                <th className="p-3 font-semibold text-sm">{isRTL ? 'تاريخ الانتهاء' : 'Expiry Date'}</th>
                                <th className="p-3 font-semibold text-sm">{isRTL ? 'الأيام المتبقية' : 'Remaining Days'}</th>
                                <th className="p-3 font-semibold text-sm">{isRTL ? 'الحالة' : 'Status'}</th>
                                <th className="p-3 font-semibold text-sm text-center">{isRTL ? 'إجراءات' : 'Actions'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center" style={{ color: 'var(--text-secondary)' }}>
                                        {isRTL ? 'جاري التحميل...' : 'Loading...'}
                                    </td>
                                </tr>
                            ) : warranties.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center" style={{ color: 'var(--text-secondary)' }}>
                                        {isRTL ? 'لا توجد ضمانات مطابقة للبحث.' : 'No warranties match the search.'}
                                    </td>
                                </tr>
                            ) : (
                                warranties.map((w: any) => {
                                    const remaining = w.days_remaining ?? 0;
                                    let remainingClass = "text-green-600 font-medium";
                                    if (w.status === 'expired') remainingClass = "text-gray-500 font-medium";
                                    else if (remaining < 30) remainingClass = "text-red-600 font-bold";
                                    else if (remaining <= 60) remainingClass = "text-orange-500 font-medium";

                                    return (
                                        <tr key={w.id} className="border-b hover:bg-black/5 dark:hover:bg-white/5" style={{ borderColor: 'var(--border-default)' }}>
                                            <td className="p-3 font-medium">{w.warranty_number}</td>
                                            <td className="p-3 text-sm">{w.product?.name_ar || w.product?.name}</td>
                                            <td className="p-3 text-sm">{w.customer?.name}</td>
                                            <td className="p-3 text-sm">{w.sale_date}</td>
                                            <td className="p-3 text-sm">{w.expiry_date}</td>
                                            <td className="p-3 text-sm">
                                                <span className={remainingClass}>
                                                    {w.status === 'expired' ? (isRTL ? 'منتهي' : 'Expired') : `${remaining} ${isRTL ? 'يوم' : 'Days'}`}
                                                </span>
                                            </td>
                                            <td className="p-3">
                                                {w.status === 'active' && <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">{isRTL ? 'نشط' : 'Active'}</span>}
                                                {w.status === 'expired' && <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">{isRTL ? 'منتهي' : 'Expired'}</span>}
                                                {w.status === 'claimed' && <span className="px-2 py-1 rounded text-xs bg-amber-100 text-amber-800">{isRTL ? 'مطالب به' : 'Claimed'}</span>}
                                                {w.status === 'void' && <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-700">{isRTL ? 'ملغي' : 'Void'}</span>}
                                            </td>
                                            <td className="p-3 text-center space-x-2 space-x-reverse">
                                                <button
                                                    onClick={() => handleOpenDetail(w)}
                                                    className="btn-secondary py-1 px-3 text-xs"
                                                >
                                                    {isRTL ? 'تفاصيل' : 'Details'}
                                                </button>
                                                {w.status === 'active' && (
                                                    <button
                                                        onClick={() => handleOpenClaim(w)}
                                                        className="btn-primary py-1 px-3 text-xs"
                                                    >
                                                        {isRTL ? 'تسجيل مطالبة' : 'Log Claim'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isDetailModalOpen && selectedWarranty && (
                <WarrantyDetailModal
                    warranty={selectedWarranty}
                    isOpen={isDetailModalOpen}
                    onClose={() => setIsDetailModalOpen(false)}
                    locale={locale}
                    onOpenClaim={() => handleOpenClaim(selectedWarranty)}
                />
            )}

            {isClaimModalOpen && claimWarranty && (
                <ClaimModal
                    warranty={claimWarranty}
                    isOpen={isClaimModalOpen}
                    onClose={() => setIsClaimModalOpen(false)}
                    onSuccess={() => {
                        setIsClaimModalOpen(false);
                        loadData();
                    }}
                    locale={locale}
                />
            )}
        </div>
    );
}
