'use client';

import { useState, useEffect } from 'react';
import { inventoryApi } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { Plus, Edit2, Trash2, X, Check, MapPin, ChevronRight, Grid, List, Zap } from 'lucide-react';

interface Warehouse { id: string; name: string; }
interface BinLocation {
    id: string;
    warehouse_id: string;
    zone: string | null;
    rack: string | null;
    shelf: string | null;
    bin: string | null;
    name: string | null;
    full_path: string;
    capacity: number | null;
    is_active: boolean;
}

const emptyForm = { warehouse_id: '', zone: '', rack: '', shelf: '', bin: '', name: '', capacity: '', is_active: true };
const emptyBulk = { warehouse_id: '', zones: '', racks: '', shelves: '', bins: '', capacity: '' };

export default function BinLocationsPage() {
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [selectedWarehouse, setSelectedWarehouse] = useState('');
    const [binLocations, setBinLocations] = useState<BinLocation[]>([]);
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState<'list' | 'tree'>('list');
    const [showForm, setShowForm] = useState(false);
    const [showBulk, setShowBulk] = useState(false);
    const [editing, setEditing] = useState<BinLocation | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [bulkForm, setBulkForm] = useState(emptyBulk);
    const [saving, setSaving] = useState(false);
    const [tree, setTree] = useState<Record<string, any>>({});

    useEffect(() => {
        inventoryApi.getWarehouses().then(res => {
            const data = res.data?.data ?? res.data ?? [];
            setWarehouses(Array.isArray(data) ? data : []);
        }).catch(() => setWarehouses([]));
    }, []);

    useEffect(() => {
        if (selectedWarehouse) fetchBinLocations();
    }, [selectedWarehouse]);

    const fetchBinLocations = async () => {
        if (!selectedWarehouse) return;
        setLoading(true);
        try {
            const res = await inventoryApi.getBinLocations(selectedWarehouse);
            const data = res.data?.data?.bin_locations ?? res.data?.bin_locations ?? res.data?.data ?? [];
            setBinLocations(Array.isArray(data) ? data : []);
            if (view === 'tree') fetchTree();
        } catch {
            toast.error('فشل تحميل مواقع البنود');
            setBinLocations([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchTree = async () => {
        if (!selectedWarehouse) return;
        try {
            const res = await inventoryApi.getBinLocationTree(selectedWarehouse);
            setTree(res.data?.data?.tree ?? res.data?.tree ?? {});
        } catch {
            setTree({});
        }
    };

    const openCreate = () => {
        setEditing(null);
        setForm({ ...emptyForm, warehouse_id: selectedWarehouse });
        setShowForm(true);
    };

    const openEdit = (bin: BinLocation) => {
        setEditing(bin);
        setForm({
            warehouse_id: bin.warehouse_id,
            zone: bin.zone ?? '', rack: bin.rack ?? '', shelf: bin.shelf ?? '', bin: bin.bin ?? '',
            name: bin.name ?? '', capacity: bin.capacity?.toString() ?? '', is_active: bin.is_active,
        });
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!form.warehouse_id) { toast.error('اختر المستودع'); return; }
        if (!form.zone && !form.rack && !form.shelf && !form.bin) { toast.error('أدخل موقعاً واحداً على الأقل'); return; }
        setSaving(true);
        try {
            const payload: any = {
                warehouse_id: form.warehouse_id,
                zone: form.zone || null, rack: form.rack || null,
                shelf: form.shelf || null, bin: form.bin || null,
                name: form.name || null,
                capacity: form.capacity ? parseFloat(form.capacity) : null,
                is_active: form.is_active,
            };
            if (editing) {
                await inventoryApi.updateBinLocation(editing.id, payload);
                toast.success('تم تحديث الموقع');
            } else {
                await inventoryApi.createBinLocation(payload);
                toast.success('تم إنشاء الموقع');
            }
            setShowForm(false);
            fetchBinLocations();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'فشلت العملية');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('هل تريد حذف هذا الموقع؟ يجب أن يكون فارغاً.')) return;
        try {
            await inventoryApi.deleteBinLocation(id);
            toast.success('تم الحذف');
            fetchBinLocations();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'فشل الحذف');
        }
    };

    const handleBulkGenerate = async () => {
        if (!bulkForm.warehouse_id || !bulkForm.zones.trim()) { toast.error('المستودع والمنطقة مطلوبان'); return; }
        setSaving(true);
        try {
            const toArr = (s: string) => s.trim() ? s.split(',').map(x => x.trim()).filter(Boolean) : undefined;
            await inventoryApi.bulkGenerateBinLocations({
                warehouse_id: bulkForm.warehouse_id,
                zones: toArr(bulkForm.zones) ?? [],
                racks: toArr(bulkForm.racks),
                shelves: toArr(bulkForm.shelves),
                bins: toArr(bulkForm.bins),
                capacity: bulkForm.capacity ? parseFloat(bulkForm.capacity) : undefined,
            });
            toast.success('تم إنشاء المواقع بالجملة');
            setShowBulk(false);
            fetchBinLocations();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'فشل الإنشاء الجماعي');
        } finally {
            setSaving(false);
        }
    };

    const renderTree = () => (
        <div className="p-4 space-y-2">
            {Object.keys(tree).length === 0 ? (
                <p className="text-center text-gray-500 py-8">لا توجد مواقع</p>
            ) : Object.entries(tree).map(([zone, racks]: any) => (
                <details key={zone} open className="border dark:border-gray-700 rounded-lg">
                    <summary className="px-4 py-2 font-semibold bg-blue-50 dark:bg-blue-900/20 cursor-pointer flex items-center gap-2">
                        <ChevronRight className="w-4 h-4" />
                        منطقة: {zone === '__none__' ? '—' : zone}
                    </summary>
                    <div className="p-2 space-y-1">
                        {Object.entries(racks).map(([rack, shelves]: any) => (
                            <details key={rack} className="ml-4 border dark:border-gray-600 rounded">
                                <summary className="px-3 py-1.5 text-sm font-medium cursor-pointer">رف: {rack === '__none__' ? '—' : rack}</summary>
                                <div className="p-2 space-y-1">
                                    {Object.entries(shelves).map(([shelf, bins]: any) => (
                                        <div key={shelf} className="ml-4">
                                            <p className="text-xs text-gray-500 mb-1">رف فرعي: {shelf === '__none__' ? '—' : shelf}</p>
                                            <div className="flex flex-wrap gap-1">
                                                {(bins as any[]).map((b: any) => (
                                                    <span key={b.id} className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded font-mono" title={b.full_path}>
                                                        {b.bin || b.full_path}
                                                        {b.capacity ? ` (${b.capacity})` : ''}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </details>
                        ))}
                    </div>
                </details>
            ))}
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">مواقع التخزين / Bin Locations</h1>
                    <p className="text-gray-500 mt-1">إدارة هيكل تخزين المستودع (منطقة / رف / خانة)</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowBulk(true)} className="flex items-center gap-2">
                        <Zap className="w-4 h-4" /> إنشاء جماعي
                    </Button>
                    <Button onClick={openCreate} disabled={!selectedWarehouse} className="flex items-center gap-2">
                        <Plus className="w-4 h-4" /> موقع جديد
                    </Button>
                </div>
            </div>

            {/* Warehouse Selector */}
            <Card className="p-4">
                <label className="text-sm font-medium mb-2 block">اختر المستودع *</label>
                <select className="border rounded px-3 py-2 w-full max-w-sm bg-white dark:bg-gray-800"
                    value={selectedWarehouse} onChange={e => setSelectedWarehouse(e.target.value)}>
                    <option value="">-- اختر مستودعاً --</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
            </Card>

            {/* Bulk Generate Form */}
            {showBulk && (
                <Card className="p-5 border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-900/10">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-lg">إنشاء مواقع جماعي</h3>
                        <button onClick={() => setShowBulk(false)}><X className="w-5 h-5 text-gray-400" /></button>
                    </div>
                    <p className="text-sm text-gray-500 mb-3">أدخل القيم مفصولة بفواصل. مثال: A,B,C أو R1,R2,R3</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">المستودع *</label>
                            <select className="border rounded px-3 py-2 w-full bg-white dark:bg-gray-800"
                                value={bulkForm.warehouse_id} onChange={e => setBulkForm(f => ({ ...f, warehouse_id: e.target.value }))}>
                                <option value="">-- اختر --</option>
                                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">المناطق (Zones) *</label>
                            <input className="border rounded px-3 py-2 w-full bg-white dark:bg-gray-800"
                                value={bulkForm.zones} onChange={e => setBulkForm(f => ({ ...f, zones: e.target.value }))} placeholder="A,B,C" />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">الأرفف (Racks)</label>
                            <input className="border rounded px-3 py-2 w-full bg-white dark:bg-gray-800"
                                value={bulkForm.racks} onChange={e => setBulkForm(f => ({ ...f, racks: e.target.value }))} placeholder="R1,R2,R3" />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">الرفوف الفرعية (Shelves)</label>
                            <input className="border rounded px-3 py-2 w-full bg-white dark:bg-gray-800"
                                value={bulkForm.shelves} onChange={e => setBulkForm(f => ({ ...f, shelves: e.target.value }))} placeholder="S1,S2" />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">الخانات (Bins)</label>
                            <input className="border rounded px-3 py-2 w-full bg-white dark:bg-gray-800"
                                value={bulkForm.bins} onChange={e => setBulkForm(f => ({ ...f, bins: e.target.value }))} placeholder="B1,B2,B3" />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">السعة الافتراضية</label>
                            <input type="number" className="border rounded px-3 py-2 w-full bg-white dark:bg-gray-800"
                                value={bulkForm.capacity} onChange={e => setBulkForm(f => ({ ...f, capacity: e.target.value }))} placeholder="0" />
                        </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                        <Button onClick={handleBulkGenerate} disabled={saving}><Zap className="w-4 h-4 mr-2" />{saving ? 'جاري الإنشاء...' : 'إنشاء'}</Button>
                        <Button variant="outline" onClick={() => setShowBulk(false)}>إلغاء</Button>
                    </div>
                </Card>
            )}

            {/* Single Bin Form */}
            {showForm && (
                <Card className="p-5 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-lg">{editing ? 'تعديل الموقع' : 'إضافة موقع جديد'}</h3>
                        <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">المستودع *</label>
                            <select className="border rounded px-3 py-2 w-full bg-white dark:bg-gray-800"
                                value={form.warehouse_id} onChange={e => setForm(f => ({ ...f, warehouse_id: e.target.value }))}>
                                <option value="">-- اختر --</option>
                                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>
                        {['zone', 'rack', 'shelf', 'bin'].map(field => (
                            <div key={field}>
                                <label className="text-sm font-medium mb-1 block capitalize">{field === 'zone' ? 'المنطقة' : field === 'rack' ? 'الرف' : field === 'shelf' ? 'الرف الفرعي' : 'الخانة'}</label>
                                <input className="border rounded px-3 py-2 w-full bg-white dark:bg-gray-800"
                                    value={(form as any)[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                                    placeholder={field.toUpperCase()} />
                            </div>
                        ))}
                        <div>
                            <label className="text-sm font-medium mb-1 block">اسم مخصص</label>
                            <input className="border rounded px-3 py-2 w-full bg-white dark:bg-gray-800"
                                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="اختياري" />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">السعة</label>
                            <input type="number" className="border rounded px-3 py-2 w-full bg-white dark:bg-gray-800"
                                value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} placeholder="0" />
                        </div>
                        <div className="flex items-center gap-2 pt-6">
                            <input type="checkbox" id="bin_active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                            <label htmlFor="bin_active" className="text-sm">نشط</label>
                        </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                        <Button onClick={handleSave} disabled={saving}><Check className="w-4 h-4 mr-2" />{saving ? 'جاري الحفظ...' : 'حفظ'}</Button>
                        <Button variant="outline" onClick={() => setShowForm(false)}>إلغاء</Button>
                    </div>
                </Card>
            )}

            {/* View Toggle + List */}
            {selectedWarehouse && (
                <Card className="overflow-hidden">
                    <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                        <p className="font-medium text-gray-700 dark:text-gray-300">{binLocations.length} موقع تخزيني</p>
                        <div className="flex gap-1">
                            <button onClick={() => { setView('list'); fetchBinLocations(); }}
                                className={`p-1.5 rounded ${view === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
                                <List className="w-4 h-4" />
                            </button>
                            <button onClick={() => { setView('tree'); fetchTree(); }}
                                className={`p-1.5 rounded ${view === 'tree' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
                                <Grid className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-gray-500">جاري التحميل...</div>
                    ) : view === 'tree' ? renderTree() : (
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-gray-800/50">
                                <tr>
                                    <th className="px-4 py-3 font-medium text-gray-500">المسار الكامل</th>
                                    <th className="px-4 py-3 font-medium text-gray-500">المنطقة</th>
                                    <th className="px-4 py-3 font-medium text-gray-500">الرف</th>
                                    <th className="px-4 py-3 font-medium text-gray-500">الرف الفرعي</th>
                                    <th className="px-4 py-3 font-medium text-gray-500">الخانة</th>
                                    <th className="px-4 py-3 font-medium text-gray-500">السعة</th>
                                    <th className="px-4 py-3 font-medium text-gray-500">الحالة</th>
                                    <th className="px-4 py-3 font-medium text-gray-500 text-right">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {binLocations.map(bin => (
                                    <tr key={bin.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-4 py-3 font-mono text-sm flex items-center gap-2">
                                            <MapPin className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                                            {bin.full_path || [bin.zone, bin.rack, bin.shelf, bin.bin].filter(Boolean).join('/')}
                                        </td>
                                        <td className="px-4 py-3 text-sm">{bin.zone ?? '—'}</td>
                                        <td className="px-4 py-3 text-sm">{bin.rack ?? '—'}</td>
                                        <td className="px-4 py-3 text-sm">{bin.shelf ?? '—'}</td>
                                        <td className="px-4 py-3 text-sm">{bin.bin ?? '—'}</td>
                                        <td className="px-4 py-3 text-sm">{bin.capacity ?? '—'}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${bin.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                {bin.is_active ? 'نشط' : 'غير نشط'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex gap-1 justify-end">
                                                <Button variant="ghost" size="sm" onClick={() => openEdit(bin)}><Edit2 className="w-4 h-4" /></Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleDelete(bin.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {binLocations.length === 0 && (
                                    <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">لا توجد مواقع. اختر مستودعاً وأضف مواقع تخزين.</td></tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </Card>
            )}
        </div>
    );
}
