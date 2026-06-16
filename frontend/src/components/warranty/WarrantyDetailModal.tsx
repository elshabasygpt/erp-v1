'use client';

import React from 'react';

interface WarrantyDetailModalProps {
    warranty: any;
    isOpen: boolean;
    onClose: () => void;
    locale: string;
    onOpenClaim: () => void;
}

export default function WarrantyDetailModal({ warranty, isOpen, onClose, locale, onOpenClaim }: WarrantyDetailModalProps) {
    if (!isOpen) return null;
    const isRTL = locale === 'ar';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ background: 'var(--bg-surface)' }}>
                <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: 'var(--border-default)' }}>
                    <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        {isRTL ? 'تفاصيل الضمان' : 'Warranty Details'} ({warranty.warranty_number})
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5" style={{ color: 'var(--text-secondary)' }}>✕</button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{isRTL ? 'المنتج' : 'Product'}</p>
                            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{warranty.product?.name_ar || warranty.product?.name}</p>
                        </div>
                        <div>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{isRTL ? 'العميل' : 'Customer'}</p>
                            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{warranty.customer?.name}</p>
                        </div>
                        <div>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{isRTL ? 'تاريخ البيع' : 'Sale Date'}</p>
                            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{warranty.sale_date}</p>
                        </div>
                        <div>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{isRTL ? 'تاريخ الانتهاء' : 'Expiry Date'}</p>
                            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{warranty.expiry_date}</p>
                        </div>
                        <div>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{isRTL ? 'الحالة' : 'Status'}</p>
                            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{warranty.status}</p>
                        </div>
                    </div>

                    <div className="border-t pt-4" style={{ borderColor: 'var(--border-default)' }}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>{isRTL ? 'المطالبات (Claims)' : 'Claims'}</h3>
                            {warranty.status === 'active' && (
                                <button onClick={onOpenClaim} className="btn-primary py-1 px-3 text-xs">
                                    {isRTL ? 'إضافة مطالبة' : 'Add Claim'}
                                </button>
                            )}
                        </div>
                        
                        {warranty.claims && warranty.claims.length > 0 ? (
                            <table className="w-full text-sm text-left" style={{ color: 'var(--text-primary)' }}>
                                <thead>
                                    <tr className="border-b" style={{ borderColor: 'var(--border-default)' }}>
                                        <th className="p-2">{isRTL ? 'رقم' : 'No'}</th>
                                        <th className="p-2">{isRTL ? 'التاريخ' : 'Date'}</th>
                                        <th className="p-2">{isRTL ? 'النوع' : 'Type'}</th>
                                        <th className="p-2">{isRTL ? 'الحالة' : 'Status'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {warranty.claims.map((c: any) => (
                                        <tr key={c.id} className="border-b" style={{ borderColor: 'var(--border-default)' }}>
                                            <td className="p-2">{c.claim_number}</td>
                                            <td className="p-2">{c.claim_date}</td>
                                            <td className="p-2">{c.claim_type}</td>
                                            <td className="p-2">{c.status}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="text-sm italic" style={{ color: 'var(--text-secondary)' }}>{isRTL ? 'لا توجد مطالبات مسجلة.' : 'No claims logged.'}</p>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t bg-black/5 dark:bg-white/5 flex justify-end" style={{ borderColor: 'var(--border-default)' }}>
                    <button onClick={onClose} className="btn-secondary px-6 py-2">
                        {isRTL ? 'إغلاق' : 'Close'}
                    </button>
                </div>
            </div>
        </div>
    );
}
