'use client';

import React, { useState } from 'react';
import { salesApi } from '@/lib/api';

interface ClaimModalProps {
    warranty: any;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    locale: string;
}

export default function ClaimModal({ warranty, isOpen, onClose, onSuccess, locale }: ClaimModalProps) {
    const isRTL = locale === 'ar';
    const [form, setForm] = useState({
        claim_type: 'replacement',
        complaint: '',
        claim_date: new Date().toISOString().split('T')[0]
    });
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!form.complaint) {
            alert(isRTL ? "يرجى كتابة وصف العطل" : "Please describe the complaint");
            return;
        }

        setLoading(true);
        try {
            await salesApi.createWarrantyClaim(warranty.id, {
                claim_type: form.claim_type as 'replacement' | 'repair' | 'refund',
                complaint: form.complaint,
                claim_date: form.claim_date
            });
            onSuccess();
        } catch (err) {
            console.error(err);
            alert(isRTL ? "حدث خطأ أثناء تسجيل المطالبة" : "Failed to log claim");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ background: 'var(--bg-surface)' }}>
                <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: 'var(--border-default)' }}>
                    <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        {isRTL ? 'تسجيل مطالبة ضمان' : 'Log Warranty Claim'}
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5" style={{ color: 'var(--text-secondary)' }}>✕</button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="p-3 rounded-lg bg-black/5 dark:bg-white/5 border text-sm" style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>
                        <p>{isRTL ? 'الضمان:' : 'Warranty:'} <span className="font-bold">{warranty.warranty_number}</span></p>
                        <p>{isRTL ? 'ينتهي في:' : 'Expires:'} <span className="font-bold">{warranty.expiry_date}</span></p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                            {isRTL ? 'نوع المطالبة' : 'Claim Type'}
                        </label>
                        <select
                            className="select-field w-full"
                            value={form.claim_type}
                            onChange={(e) => setForm({ ...form, claim_type: e.target.value })}
                        >
                            <option value="replacement">{isRTL ? 'استبدال قطعة' : 'Replacement'}</option>
                            <option value="repair">{isRTL ? 'إصلاح' : 'Repair'}</option>
                            <option value="refund">{isRTL ? 'استرداد مبلغ' : 'Refund'}</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                            {isRTL ? 'تاريخ المطالبة' : 'Claim Date'}
                        </label>
                        <input
                            type="date"
                            className="input-field w-full"
                            value={form.claim_date}
                            onChange={(e) => setForm({ ...form, claim_date: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                            {isRTL ? 'وصف العطل / السبب' : 'Complaint / Reason'}
                        </label>
                        <textarea
                            className="input-field w-full h-24 resize-none"
                            value={form.complaint}
                            onChange={(e) => setForm({ ...form, complaint: e.target.value })}
                            placeholder={isRTL ? "اشرح المشكلة هنا..." : "Describe the issue here..."}
                        />
                    </div>
                </div>

                <div className="p-4 border-t bg-black/5 dark:bg-white/5 flex justify-end gap-3" style={{ borderColor: 'var(--border-default)' }}>
                    <button onClick={onClose} className="btn-secondary px-6 py-2" disabled={loading}>
                        {isRTL ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button onClick={handleSubmit} className="btn-primary px-6 py-2" disabled={loading}>
                        {loading ? (isRTL ? 'جاري التسجيل...' : 'Logging...') : (isRTL ? 'تسجيل المطالبة' : 'Log Claim')}
                    </button>
                </div>
            </div>
        </div>
    );
}
