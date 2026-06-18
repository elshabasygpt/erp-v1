'use client';

import React, { useState, useEffect } from 'react';
import { crmApi } from '@/lib/api';

export default function CustomerVehiclesPage({ params: { locale } }: { params: { locale: string } }) {
    const isRTL = locale === 'ar';
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const loadVehicles = async (query = '') => {
        setLoading(true);
        try {
            const res = await crmApi.searchVehicleByPlate(query);
            setVehicles(res.data?.data || []);
        } catch (error) {

        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            loadVehicles(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    return (
        <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    {isRTL ? 'سيارات العملاء' : 'Customer Vehicles'}
                </h1>
            </div>

            <div className="glass-card p-4 flex gap-4">
                <input
                    type="text"
                    placeholder={isRTL ? 'بحث برقم اللوحة، الهيكل، أو اسم العميل...' : 'Search by plate, VIN, or customer...'}
                    className="w-full px-4 py-2.5 rounded-xl border"
                    style={{ borderColor: 'var(--border-default)', background: 'var(--bg-input)' }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="glass-card p-4 overflow-hidden overflow-x-auto">
                <table className="w-full text-sm text-start">
                    <thead>
                        <tr className="border-b" style={{ borderColor: 'var(--border-default)' }}>
                            <th className="py-3 px-4 text-start font-semibold" style={{ color: 'var(--text-secondary)' }}>{isRTL ? 'العميل' : 'Customer'}</th>
                            <th className="py-3 px-4 text-start font-semibold" style={{ color: 'var(--text-secondary)' }}>{isRTL ? 'السيارة' : 'Vehicle'}</th>
                            <th className="py-3 px-4 text-start font-semibold" style={{ color: 'var(--text-secondary)' }}>{isRTL ? 'رقم اللوحة' : 'Plate Number'}</th>
                            <th className="py-3 px-4 text-start font-semibold" style={{ color: 'var(--text-secondary)' }}>{isRTL ? 'الإجراءات' : 'Actions'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="text-center py-8">{isRTL ? 'جاري التحميل...' : 'Loading...'}</td>
                            </tr>
                        ) : vehicles.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                                    {isRTL ? 'لا توجد سيارات مطابقة للبحث.' : 'No vehicles found.'}
                                </td>
                            </tr>
                        ) : vehicles.map(v => (
                            <tr key={v.id} className="border-b last:border-0 hover:bg-black/5" style={{ borderColor: 'var(--border-default)' }}>
                                <td className="py-3 px-4">
                                    <div className="font-bold">{v.customer?.name}</div>
                                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{v.customer?.phone}</div>
                                </td>
                                <td className="py-3 px-4 font-medium">{v.display_name}</td>
                                <td className="py-3 px-4">
                                    <span className="px-2 py-1 rounded-md border font-bold" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}>
                                        {v.plate_number || v.plate_number_en || '---'}
                                    </span>
                                </td>
                                <td className="py-3 px-4">
                                    <button className="text-blue-600 hover:underline font-medium text-xs">
                                        {isRTL ? 'عرض في ملف العميل' : 'View in Customer Profile'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
