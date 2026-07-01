'use client';

import { useState, useEffect } from 'react';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { useModalA11y } from '@/hooks/useModalA11y';
import { inventoryApi } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { X, Plus, Trash2, Upload } from 'lucide-react';
import Skeleton from '@/components/ui/Skeleton';

interface CrossRef {
    id: string;
    reference_number: string;
    reference_brand: string | null;
    reference_type: 'oem' | 'aftermarket' | 'equivalent' | 'superseded';
    notes: string | null;
}

const TYPE_LABELS: Record<string, string> = {
    oem: 'أصلي (OEM)',
    aftermarket: 'بديل (Aftermarket)',
    equivalent: 'مكافئ (Equivalent)',
    superseded: 'مُحلّ (Superseded)',
};

interface Props {
    productId: string;
    productName: string;
    isRTL: boolean;
    onClose: () => void;
}

export function CrossReferenceManagerModal({ productId, productName, isRTL, onClose }: Props) {
    const modalRef = useModalA11y<HTMLDivElement>(true, onClose);
    const [refs, setRefs] = useState<CrossRef[]>([]);
    const [loading, setLoading] = useState(true);
    const confirm = useConfirm();
    const [form, setForm] = useState({ reference_number: '', reference_brand: '', reference_type: 'oem' as CrossRef['reference_type'] });
    const [saving, setSaving] = useState(false);
    const [bulkOpen, setBulkOpen] = useState(false);
    const [bulkText, setBulkText] = useState('');
    const [bulkSaving, setBulkSaving] = useState(false);

    useEffect(() => {
        fetchRefs();
    }, [productId]);

    const fetchRefs = async () => {
        setLoading(true);
        try {
            const res = await inventoryApi.getCrossReferences(productId);
            setRefs(res.data?.data ?? res.data ?? []);
        } catch {
            toast.error('فشل تحميل الأرقام');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!form.reference_number.trim()) {
            toast.error('رقم القطعة مطلوب');
            return;
        }
        setSaving(true);
        try {
            await inventoryApi.addCrossReference(productId, {
                reference_number: form.reference_number.trim(),
                reference_brand: form.reference_brand.trim() || undefined,
                reference_type: form.reference_type,
            });
            toast.success('تمت الإضافة');
            setForm({ reference_number: '', reference_brand: '', reference_type: 'oem' });
            fetchRefs();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'فشلت الإضافة');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (refId: string, refNumber: string) => {
        if (!await confirm(`حذف الرقم "${refNumber}"؟`)) return;
        try {
            await inventoryApi.deleteCrossReference(productId, refId);
            toast.success('تم الحذف');
            fetchRefs();
        } catch {
            toast.error('فشل الحذف');
        }
    };

    const handleBulkSave = async () => {
        if (!bulkText.trim()) return;
        const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
        const items = lines.map(line => {
            const parts = line.split(',');
            return {
                reference_number: parts[0]?.trim() ?? '',
                reference_brand: parts[1]?.trim() || undefined,
                reference_type: (parts[2]?.trim() as CrossRef['reference_type']) || 'aftermarket' as const,
            };
        }).filter(i => i.reference_number);

        if (items.length === 0) {
            toast.error('لا توجد أرقام صالحة');
            return;
        }

        setBulkSaving(true);
        try {
            const res = await inventoryApi.bulkAddCrossReferences(productId, items);
            const d = res.data?.data ?? res.data;
            toast.success(res.data?.message || `تمت إضافة ${d?.added ?? 0}`);
            setBulkText('');
            setBulkOpen(false);
            fetchRefs();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'فشلت العملية الدفعية');
        } finally {
            setBulkSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
                style={{ background: 'var(--bg-card)' }}
                dir={isRTL ? 'rtl' : 'ltr'}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-default)' }}>
                    <div>
                        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                            {isRTL ? 'أرقام القطعة البديلة' : 'Cross-Reference Numbers'}
                        </h2>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{productName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                        <X className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                    </button>
                </div>

                <div className="p-5 space-y-5">
                    {/* Existing refs table */}
                    <div>
                        {loading ? (
                            <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--border-default)' }}>
                                <div className="overflow-x-auto"><table className="w-full text-sm">
                                    <tbody>
                                        {Array.from({ length: 6 }).map((_, i) => (
                                            <tr key={`sk-${i}`} style={{ borderTop: i > 0 ? '1px solid var(--border-default)' : undefined }}>
                                                {Array.from({ length: 4 }).map((__, j) => (
                                                    <td key={j} className="p-3"><Skeleton className="w-3/4 h-4" /></td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table></div>
                            </div>
                        ) : refs.length === 0 ? (
                            <div className="text-center py-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                {isRTL ? 'لا توجد أرقام بديلة مضافة بعد' : 'No cross-reference numbers added yet'}
                            </div>
                        ) : (
                            <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--border-default)' }}>
                                <div className="overflow-x-auto"><table className="w-full text-sm">
                                    <thead>
                                        <tr style={{ background: 'var(--bg-secondary)' }}>
                                            <th className="px-3 py-2 text-start font-medium" style={{ color: 'var(--text-secondary)' }}>
                                                {isRTL ? 'الرقم' : 'Number'}
                                            </th>
                                            <th className="px-3 py-2 text-start font-medium" style={{ color: 'var(--text-secondary)' }}>
                                                {isRTL ? 'الماركة' : 'Brand'}
                                            </th>
                                            <th className="px-3 py-2 text-start font-medium" style={{ color: 'var(--text-secondary)' }}>
                                                {isRTL ? 'النوع' : 'Type'}
                                            </th>
                                            <th className="px-3 py-2 w-10" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {refs.map((r, i) => (
                                            <tr
                                                key={r.id}
                                                style={{ borderTop: i > 0 ? '1px solid var(--border-default)' : undefined }}
                                            >
                                                <td className="px-3 py-2 font-mono" style={{ color: 'var(--text-primary)' }}>
                                                    {r.reference_number}
                                                </td>
                                                <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>
                                                    {r.reference_brand ?? '—'}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                                                        {TYPE_LABELS[r.reference_type] ?? r.reference_type}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <button
                                                        onClick={() => handleDelete(r.id, r.reference_number)}
                                                        className="text-red-400 hover:text-red-600 p-1"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table></div>
                            </div>
                        )}
                    </div>

                    {/* Add single */}
                    <div className="border rounded-xl p-4 space-y-3" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
                        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {isRTL ? 'إضافة رقم جديد' : 'Add New Number'}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <input
                                className="input-field font-mono col-span-1"
                                placeholder={isRTL ? 'رقم القطعة *' : 'Part Number *'}
                                value={form.reference_number}
                                onChange={e => setForm(f => ({ ...f, reference_number: e.target.value }))}
                                dir="ltr"
                            />
                            <input
                                className="input-field col-span-1"
                                placeholder={isRTL ? 'الماركة (Bosch, Mann...)' : 'Brand (Bosch, Mann...)'}
                                value={form.reference_brand}
                                onChange={e => setForm(f => ({ ...f, reference_brand: e.target.value }))}
                            />
                            <select
                                className="select-field col-span-1"
                                value={form.reference_type}
                                onChange={e => setForm(f => ({ ...f, reference_type: e.target.value as CrossRef['reference_type'] }))}
                            >
                                {Object.entries(TYPE_LABELS).map(([v, label]) => (
                                    <option key={v} value={v}>{label}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={handleAdd}
                            disabled={saving}
                            className="btn-primary flex items-center gap-2 text-sm px-4 py-2"
                        >
                            {saving
                                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                : <Plus className="w-4 h-4" />
                            }
                            {isRTL ? 'إضافة' : 'Add'}
                        </button>
                    </div>

                    {/* Bulk paste */}
                    <div>
                        <button
                            onClick={() => setBulkOpen(o => !o)}
                            className="flex items-center gap-2 text-sm font-medium"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            <Upload className="w-4 h-4" />
                            {isRTL ? 'لصق دفعة من الأرقام' : 'Paste Bulk Numbers'}
                        </button>

                        {bulkOpen && (
                            <div className="mt-3 border rounded-xl p-4 space-y-3" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
                                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                    {isRTL
                                        ? 'سطر لكل رقم. الصيغة: رقم,ماركة,نوع (الماركة والنوع اختياريان)'
                                        : 'One number per line. Format: number,brand,type (brand and type optional)'}
                                </p>
                                <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }} dir="ltr">
                                    {'0986452041,Bosch,oem\nW68/3,Mann\n90915-YZZD3'}
                                </p>
                                <textarea
                                    className="input-field w-full font-mono text-sm"
                                    rows={6}
                                    placeholder={'0986452041,Bosch,oem\nW68/3,Mann\n90915-YZZD3'}
                                    value={bulkText}
                                    onChange={e => setBulkText(e.target.value)}
                                    dir="ltr"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleBulkSave}
                                        disabled={bulkSaving}
                                        className="btn-primary flex items-center gap-2 text-sm px-4 py-2"
                                    >
                                        {bulkSaving
                                            ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            : <Upload className="w-4 h-4" />
                                        }
                                        {isRTL ? 'حفظ الدفعة' : 'Save Bulk'}
                                    </button>
                                    <button
                                        onClick={() => { setBulkOpen(false); setBulkText(''); }}
                                        className="btn-secondary text-sm px-4 py-2"
                                    >
                                        {isRTL ? 'إلغاء' : 'Cancel'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
