'use client';

import { useState, useEffect } from 'react';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { useLanguage } from '@/i18n/LanguageContext';
import { inventoryApi } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { Plus, Edit2, Trash2, X, Check, Ruler } from 'lucide-react';
import Skeleton from '@/components/ui/Skeleton';

interface Unit {
    id: string;
    name: string;
    name_ar: string;
    symbol: string | null;
    is_active: boolean;
}

export default function UnitsPage() {
    const { isRTL } = useLanguage();
    const [units, setUnits] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const confirm = useConfirm();
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Unit | null>(null);
    const [form, setForm] = useState({ name: '', name_ar: '', symbol: '', is_active: true });
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => { fetchUnits(); }, []);

    const fetchUnits = async () => {
        try {
            setLoading(true);
            setLoadError(false);
            const res = await inventoryApi.getUnits();
            const data = res.data?.data ?? res.data ?? [];
            setUnits(Array.isArray(data) ? data : []);
        } catch {
            toast.error(isRTL ? 'فشل تحميل وحدات القياس' : 'Failed to load units of measure');
            setUnits([]);
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setEditing(null);
        setForm({ name: '', name_ar: '', symbol: '', is_active: true });
        setShowForm(true);
    };

    const openEdit = (unit: Unit) => {
        setEditing(unit);
        setForm({ name: unit.name, name_ar: unit.name_ar, symbol: unit.symbol ?? '', is_active: unit.is_active });
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!form.name.trim() || !form.name_ar.trim()) {
            toast.error(isRTL ? 'الاسم مطلوب بالعربية والإنجليزية' : 'Name is required in both Arabic and English');
            return;
        }
        setSaving(true);
        try {
            const payload = { name: form.name, name_ar: form.name_ar, symbol: form.symbol || null, is_active: form.is_active };
            if (editing) {
                await inventoryApi.updateUnit(editing.id, payload);
                toast.success(isRTL ? 'تم تحديث وحدة القياس' : 'Unit updated');
            } else {
                await inventoryApi.createUnit(payload);
                toast.success(isRTL ? 'تم إنشاء وحدة القياس' : 'Unit created');
            }
            setShowForm(false);
            fetchUnits();
        } catch (err: any) {
            toast.error(err.response?.data?.message || (isRTL ? 'فشلت العملية' : 'Operation failed'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!await confirm(isRTL ? `هل تريد حذف "${name}"؟` : `Delete "${name}"?`)) return;
        try {
            await inventoryApi.deleteUnit(id);
            toast.success(isRTL ? 'تم الحذف' : 'Deleted');
            fetchUnits();
        } catch (err: any) {
            toast.error(err.response?.data?.message || (isRTL ? 'فشل الحذف - قد تكون الوحدة مستخدمة في منتجات' : 'Failed to delete - the unit may be in use by products'));
        }
    };

    const filtered = units.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.name_ar.includes(search) ||
        (u.symbol ?? '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isRTL ? 'وحدات القياس' : 'Units of Measure'}</h1>
                    <p className="text-gray-500 mt-1">{isRTL ? 'إدارة وحدات قياس المنتجات (قطعة، كيلو، لتر...)' : 'Manage product units of measure (piece, kg, liter...)'}</p>
                </div>
                <Button onClick={openCreate} className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    {isRTL ? 'وحدة جديدة' : 'New Unit'}
                </Button>
            </div>

            {showForm && (
                <Card className="p-5 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-lg">{editing ? (isRTL ? 'تعديل الوحدة' : 'Edit Unit') : (isRTL ? 'إضافة وحدة جديدة' : 'Add New Unit')}</h3>
                        <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">{isRTL ? 'الاسم (English) *' : 'English Name *'}</label>
                            <input className="border rounded px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-600"
                                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Piece, Kilogram..." />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">{isRTL ? 'الاسم بالعربي *' : 'Arabic Name *'}</label>
                            <input className="border rounded px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-600"
                                value={form.name_ar} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))} placeholder={isRTL ? 'قطعة، كيلو...' : 'Piece, kilo...'} dir="rtl" />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">{isRTL ? 'الرمز (Symbol)' : 'Symbol'}</label>
                            <input className="border rounded px-3 py-2 w-full bg-white dark:bg-gray-800 dark:border-gray-600"
                                value={form.symbol} onChange={e => setForm(f => ({ ...f, symbol: e.target.value }))} placeholder="pcs, kg, L..." />
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="unit_active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                            <label htmlFor="unit_active" className="text-sm">{isRTL ? 'نشط' : 'Active'}</label>
                        </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                        <Button onClick={handleSave} disabled={saving}><Check className="w-4 h-4 mr-2" />{saving ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ' : 'Save')}</Button>
                        <Button variant="outline" onClick={() => setShowForm(false)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
                    </div>
                </Card>
            )}

            <Card className="overflow-hidden">
                <div className="p-4 border-b dark:border-gray-700">
                    <input
                        className="border rounded px-3 py-2 w-full max-w-sm bg-white dark:bg-gray-800"
                        placeholder={isRTL ? 'بحث...' : 'Search...'}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                {(
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-800/50">
                            <tr>
                                <th className="px-4 py-3 font-medium text-gray-500">#</th>
                                <th className="px-4 py-3 font-medium text-gray-500">{isRTL ? 'الاسم' : 'Name'}</th>
                                <th className="px-4 py-3 font-medium text-gray-500">{isRTL ? 'الاسم بالعربي' : 'Arabic Name'}</th>
                                <th className="px-4 py-3 font-medium text-gray-500">{isRTL ? 'الرمز' : 'Symbol'}</th>
                                <th className="px-4 py-3 font-medium text-gray-500">{isRTL ? 'الحالة' : 'Status'}</th>
                                <th className="px-4 py-3 font-medium text-gray-500 text-right">{isRTL ? 'إجراءات' : 'Actions'}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {loading ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <tr key={`sk-${i}`}>
                                        {Array.from({ length: 6 }).map((__, j) => (
                                            <td key={j} className="p-3"><Skeleton className="w-3/4 h-4" /></td>
                                        ))}
                                    </tr>
                                ))
                            ) : loadError ? (
                                <tr><td colSpan={6} className="p-8 text-center">
                                    <p className="mb-3 text-sm" style={{ color: 'var(--text-danger, #dc2626)' }}>{isRTL ? 'تعذّر تحميل البيانات.' : 'Failed to load data.'}</p>
                                    <button onClick={() => fetchUnits()} className="btn-secondary py-1.5 px-4 text-xs">🔄 {isRTL ? 'إعادة المحاولة' : 'Retry'}</button>
                                </td></tr>
                            ) : filtered.map((unit, idx) => (
                                <tr key={unit.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <td className="px-4 py-3 text-gray-500 text-sm">{idx + 1}</td>
                                    <td className="px-4 py-3 font-medium flex items-center gap-2">
                                        <Ruler className="w-4 h-4 text-blue-400" />
                                        {unit.name}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{unit.name_ar}</td>
                                    <td className="px-4 py-3">
                                        {unit.symbol && <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-sm font-mono">{unit.symbol}</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${unit.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {unit.is_active ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'غير نشط' : 'Inactive')}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex gap-1 justify-end">
                                            <Button variant="ghost" size="sm" onClick={() => openEdit(unit)}><Edit2 className="w-4 h-4" /></Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleDelete(unit.id, unit.name)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!loading && !loadError && filtered.length === 0 && (
                                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">{isRTL ? 'لا توجد وحدات قياس. أضف وحدة جديدة للبدء.' : 'No units of measure found. Add a new unit to start.'}</td></tr>
                            )}
                        </tbody>
                    </table>
                )}
            </Card>
        </div>
    );
}
