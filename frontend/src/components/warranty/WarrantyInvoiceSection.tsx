'use client';

import React, { useState, useEffect } from 'react';
import { salesApi } from '@/lib/api';

export default function WarrantyInvoiceSection({ invoiceId, locale }: { invoiceId: string; locale: string }) {
    const isRTL = locale === 'ar';
    const [warranties, setWarranties] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWarranties = async () => {
            try {
                const res = await salesApi.getInvoiceWarranties(invoiceId);
                setWarranties(res.data?.data || []);
            } catch (error) {
                console.error("Error fetching invoice warranties", error);
            } finally {
                setLoading(false);
            }
        };

        if (invoiceId) {
            fetchWarranties();
        }
    }, [invoiceId]);

    if (loading) {
        return <div className="text-sm p-4 text-center" style={{ color: 'var(--text-secondary)' }}>{isRTL ? 'جاري تحميل الضمانات...' : 'Loading warranties...'}</div>;
    }

    if (warranties.length === 0) {
        return (
            <div className="mt-6 border-t pt-4" style={{ borderColor: 'var(--border-default)' }}>
                <h3 className="font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{isRTL ? 'الضمانات' : 'Warranties'}</h3>
                <p className="text-sm italic" style={{ color: 'var(--text-secondary)' }}>
                    {isRTL ? 'لا توجد ضمانات مرتبطة بهذه الفاتورة.' : 'No warranties associated with this invoice.'}
                </p>
            </div>
        );
    }

    return (
        <div className="mt-6 border-t pt-4" style={{ borderColor: 'var(--border-default)' }}>
            <h3 className="font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{isRTL ? 'الضمانات المرتبطة بالفاتورة' : 'Warranties Associated with Invoice'}</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left" style={{ color: 'var(--text-primary)' }}>
                    <thead>
                        <tr className="border-b" style={{ borderColor: 'var(--border-default)' }}>
                            <th className="p-2 font-semibold">{isRTL ? 'رقم الضمان' : 'Warranty No'}</th>
                            <th className="p-2 font-semibold">{isRTL ? 'المنتج' : 'Product'}</th>
                            <th className="p-2 font-semibold">{isRTL ? 'تاريخ الانتهاء' : 'Expiry Date'}</th>
                            <th className="p-2 font-semibold">{isRTL ? 'الحالة' : 'Status'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {warranties.map((w: any) => (
                            <tr key={w.id} className="border-b" style={{ borderColor: 'var(--border-default)' }}>
                                <td className="p-2 font-medium">{w.warranty_number}</td>
                                <td className="p-2">{w.product?.name_ar || w.product?.name}</td>
                                <td className="p-2">{w.expiry_date}</td>
                                <td className="p-2">
                                    {w.status === 'active' && <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">{isRTL ? 'نشط' : 'Active'}</span>}
                                    {w.status === 'expired' && <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">{isRTL ? 'منتهي' : 'Expired'}</span>}
                                    {w.status === 'claimed' && <span className="px-2 py-1 rounded text-xs bg-amber-100 text-amber-800">{isRTL ? 'مطالب به' : 'Claimed'}</span>}
                                    {w.status === 'void' && <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-700">{isRTL ? 'ملغي' : 'Void'}</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
