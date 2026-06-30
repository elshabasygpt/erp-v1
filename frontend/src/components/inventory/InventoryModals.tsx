'use client';
import { useState, memo, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { inventoryApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { useRegionalSettings } from '@/providers/RegionalSettingsProvider';
import {
    ProductLabel, LabelPrintSheet, usePrintLabels,
    type LabelOptions, type LabelProduct, DEFAULT_LABEL_OPTIONS, LABEL_SIZE_OPTIONS,
} from './labels/ProductLabel';

// ── Types ──
export interface MainGroup { id: string; name: string; nameAr: string; subGroups: SubGroup[]; imageUrl?: string; discount?: number; }
export interface SubGroup { id: string; name: string; nameAr: string; imageUrl?: string; discount?: number; }
export interface Unit { id: string; name: string; nameAr: string; symbol: string; }
export interface StockMovement { id: string; type: 'incoming' | 'outgoing' | 'adjustment' | 'return'; qty: number; date: string; note: string; }

// ── Manage Groups Modal ──
interface GroupsProps { dict: any; locale: string; groups: MainGroup[]; setGroups: (g: MainGroup[]) => void; onClose: () => void; }

export const ManageGroupsModal = memo(function ManageGroupsModal({ dict, locale, groups, setGroups, onClose }: GroupsProps) {
    const isRTL = locale === 'ar';
    const inv = dict.inventory;
    
    const [newMain, setNewMain] = useState('');
    const [newMainAr, setNewMainAr] = useState('');
    const [newMainImage, setNewMainImage] = useState('');
    const [newMainDiscount, setNewMainDiscount] = useState<number | ''>('');
    
    const [newSub, setNewSub] = useState('');
    const [newSubAr, setNewSubAr] = useState('');
    const [newSubImage, setNewSubImage] = useState('');
    const [newSubDiscount, setNewSubDiscount] = useState<number | ''>('');
    
    const [selectedMain, setSelectedMain] = useState('');
    
    const [editingMain, setEditingMain] = useState<string | null>(null);
    const [editMainName, setEditMainName] = useState('');
    const [editMainNameAr, setEditMainNameAr] = useState('');
    const [editMainImage, setEditMainImage] = useState('');
    const [editMainDiscount, setEditMainDiscount] = useState<number | ''>('');
    
    const [editingSub, setEditingSub] = useState<{ mainId: string; subId: string } | null>(null);
    const [editSubName, setEditSubName] = useState('');
    const [editSubNameAr, setEditSubNameAr] = useState('');
    const [editSubImage, setEditSubImage] = useState('');
    const [editSubDiscount, setEditSubDiscount] = useState<number | ''>('');

    const [isSaving, setIsSaving] = useState(false);
    const queryClient = useQueryClient();

    const [uploading, setUploading] = useState(false);

    const handleImageUpload = async (file: File) => {
        setUploading(true);
        try {
            const { inventoryApi } = await import('@/lib/api');
            const res = await inventoryApi.uploadProductImage(file);
            return res.data?.data?.image_url;
        } catch (err) {

            toast.error(isRTL ? "فشل تحميل الصورة" : "Failed to upload image");
            return null;
        } finally {
            setUploading(false);
        }
    };

    const ImageUploadButton = ({ url, onChange, disabled }: { url: string; onChange: (url: string) => void; disabled?: boolean }) => (
        <label className={`relative w-8 h-8 rounded-lg border flex items-center justify-center cursor-pointer overflow-hidden flex-shrink-0 transition-colors ${url ? 'border-primary-500' : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'}`} style={{ background: 'var(--bg-input)' }}>
            {url ? <img src={url} alt="Image preview" className="w-full h-full object-cover" /> : <span className="text-[10px] text-gray-400">🖼️</span>}
            <input type="file" accept="image/*" className="hidden" disabled={disabled} onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                    const uploadedUrl = await handleImageUpload(file);
                    if (uploadedUrl) onChange(uploadedUrl);
                }
            }} />
            {url && (
                <button 
                    type="button" 
                    onClick={(e) => { e.preventDefault(); onChange(''); }}
                    className="absolute -top-1 -right-1 bg-red-500 text-white w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px]"
                 aria-label={isRTL ? 'إغلاق' : 'Close'}>✕</button>
            )}
        </label>
    );

    const addMainGroup = async () => {
        if (!newMain && !newMainAr) return;
        setIsSaving(true);
        try {
            await inventoryApi.createCategory({
                name: newMain || newMainAr,
                name_ar: newMainAr || newMain,
                image_url: newMainImage || undefined,
                discount: newMainDiscount === '' ? undefined : Number(newMainDiscount)
            });
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            setNewMain(''); setNewMainAr(''); setNewMainImage(''); setNewMainDiscount('');
        } finally {
            setIsSaving(false);
        }
    };

    const deleteMainGroup = async (id: string) => {
        await inventoryApi.deleteCategory(id);
        queryClient.invalidateQueries({ queryKey: ['categories'] });
    };
    
    const startEditMain = (g: MainGroup) => { 
        setEditingMain(g.id); setEditMainName(g.name); setEditMainNameAr(g.nameAr); 
        setEditMainImage(g.imageUrl || ''); setEditMainDiscount(g.discount !== undefined ? g.discount : '');
    };

    const saveEditMain = async () => {
        if (!editingMain) return;
        setIsSaving(true);
        try {
            await inventoryApi.updateCategory(editingMain, {
                name: editMainName || undefined,
                name_ar: editMainNameAr || undefined,
                image_url: editMainImage || undefined,
                discount: editMainDiscount === '' ? undefined : Number(editMainDiscount)
            });
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            setEditingMain(null);
        } finally {
            setIsSaving(false);
        }
    };

    const addSubGroup = async () => {
        if (!selectedMain || (!newSub && !newSubAr)) return;
        setIsSaving(true);
        try {
            await inventoryApi.createCategory({
                name: newSub || newSubAr,
                name_ar: newSubAr || newSub,
                parent_id: selectedMain,
                image_url: newSubImage || undefined,
                discount: newSubDiscount === '' ? undefined : Number(newSubDiscount)
            });
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            setNewSub(''); setNewSubAr(''); setNewSubImage(''); setNewSubDiscount('');
        } finally {
            setIsSaving(false);
        }
    };

    const deleteSubGroup = async (mainId: string, subId: string) => {
        await inventoryApi.deleteCategory(subId);
        queryClient.invalidateQueries({ queryKey: ['categories'] });
    };
    
    const startEditSub = (mainId: string, sub: SubGroup) => { 
        setEditingSub({ mainId, subId: sub.id }); setEditSubName(sub.name); setEditSubNameAr(sub.nameAr); 
        setEditSubImage(sub.imageUrl || ''); setEditSubDiscount(sub.discount !== undefined ? sub.discount : '');
    };

    const saveEditSub = async () => {
        if (!editingSub) return;
        setIsSaving(true);
        try {
            await inventoryApi.updateCategory(editingSub.subId, {
                name: editSubName || undefined,
                name_ar: editSubNameAr || undefined,
                image_url: editSubImage || undefined,
                discount: editSubDiscount === '' ? undefined : Number(editSubDiscount)
            });
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            setEditingSub(null);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-content !max-w-4xl">
                <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-default)' }}>
                    <div className="flex items-center gap-2"><span className="text-xl">📁</span><h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{inv.manageGroups}</h2></div>
                    <button onClick={onClose} className="btn-icon"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Main Groups */}
                    <div className="bg-gray-50/50 dark:bg-gray-800/20 p-4 rounded-xl border" style={{ borderColor: 'var(--border-default)' }}>
                        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}><span className="w-2 h-2 rounded-full bg-primary-500" />{inv.mainGroups}</h3>
                        <div className="flex gap-2 mb-4 items-center">
                            <ImageUploadButton url={newMainImage} onChange={setNewMainImage} disabled={uploading} />
                            <div className="flex-1 flex gap-2">
                                <input className="input-field py-2 text-sm flex-1" placeholder={isRTL ? 'الاسم (عربي)' : 'Name (EN)'} value={isRTL ? newMainAr : newMain} onChange={e => isRTL ? setNewMainAr(e.target.value) : setNewMain(e.target.value)} />
                                <input type="number" min="0" max="100" className="input-field py-2 text-sm w-16" placeholder="% خصم" value={newMainDiscount} onChange={e => setNewMainDiscount(e.target.value ? Number(e.target.value) : "")} />
                                <button onClick={addMainGroup} disabled={isSaving} className="btn-primary text-xs px-3 whitespace-nowrap disabled:opacity-50">+ {inv.addGroup}</button>
                            </div>
                        </div>
                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                            {groups.map(g => (
                                <div key={g.id} className="glass-card p-3 flex items-center justify-between group transition-all hover:border-primary-200">
                                    {editingMain === g.id ? (
                                        <div className="flex gap-2 items-center flex-1">
                                            <ImageUploadButton url={editMainImage} onChange={setEditMainImage} disabled={uploading} />
                                            <div className="flex-1 flex items-center gap-1.5">
                                                <input className="input-field py-1 text-sm flex-1" value={isRTL ? editMainNameAr : editMainName} onChange={e => isRTL ? setEditMainNameAr(e.target.value) : setEditMainName(e.target.value)} />
                                                <input type="number" min="0" max="100" className="input-field py-1 text-sm w-14" placeholder="%" value={editMainDiscount} onChange={e => setEditMainDiscount(e.target.value ? Number(e.target.value) : "")} />
                                                <button onClick={saveEditMain} disabled={isSaving} className="btn-icon w-6 h-6 text-green-500 disabled:opacity-50">✓</button>
                                                <button onClick={() => setEditingMain(null)} disabled={isSaving} className="btn-icon w-6 h-6 text-red-400 disabled:opacity-50">✗</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-3">
                                                {g.imageUrl ? (
                                                    <img src={g.imageUrl} alt={g.name} className="w-10 h-10 rounded-lg object-cover border" style={{ borderColor: 'var(--border-default)' }} />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg border" style={{ background: 'var(--bg-surface-secondary)', borderColor: 'var(--border-default)' }}>📁</div>
                                                )}
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{isRTL ? g.nameAr : g.name}</span>
                                                        {g.discount ? <span className="px-1.5 py-0.5 rounded-md bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[10px] font-bold border border-red-200 dark:border-red-800/50">-{g.discount}%</span> : null}
                                                    </div>
                                                    <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>{isRTL ? `${g.subGroups.length} مجموعات فرعية` : `${g.subGroups.length} sub groups`}</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => startEditMain(g)} className="btn-icon w-8 h-8 text-xs" style={{ color: 'var(--text-muted)' }} aria-label={isRTL ? 'تعديل' : 'Edit'}>✏️</button>
                                                <button onClick={() => deleteMainGroup(g.id)} className="btn-icon w-8 h-8 text-xs text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20" aria-label={isRTL ? 'حذف' : 'Delete'}>🗑️</button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Sub Groups */}
                    <div className="bg-gray-50/50 dark:bg-gray-800/20 p-4 rounded-xl border" style={{ borderColor: 'var(--border-default)' }}>
                        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}><span className="w-2 h-2 rounded-full bg-blue-500" />{inv.subGroups}</h3>
                        <select className="select-field py-2 text-sm mb-4 w-full" value={selectedMain} onChange={e => setSelectedMain(e.target.value)}>
                            <option value="">{inv.selectMainGroup}</option>
                            {groups.map(g => <option key={g.id} value={g.id}>{isRTL ? g.nameAr : g.name}</option>)}
                        </select>
                        {selectedMain && (
                            <>
                                <div className="flex gap-2 mb-4 items-center">
                                    <ImageUploadButton url={newSubImage} onChange={setNewSubImage} disabled={uploading} />
                                    <div className="flex-1 flex gap-2">
                                        <input className="input-field py-2 text-sm flex-1" placeholder={isRTL ? 'الاسم (عربي)' : 'Name (EN)'} value={isRTL ? newSubAr : newSub} onChange={e => isRTL ? setNewSubAr(e.target.value) : setNewSub(e.target.value)} />
                                        <input type="number" min="0" max="100" className="input-field py-2 text-sm w-16" placeholder="% خصم" value={newSubDiscount} onChange={e => setNewSubDiscount(e.target.value ? Number(e.target.value) : "")} />
                                        <button onClick={addSubGroup} disabled={isSaving} className="btn-primary text-xs px-3 whitespace-nowrap disabled:opacity-50">+ {inv.addSubGroup}</button>
                                    </div>
                                </div>
                                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                    {groups.find(g => g.id === selectedMain)?.subGroups.map(s => (
                                        <div key={s.id} className="glass-card p-3 flex items-center justify-between group transition-all hover:border-blue-200">
                                            {editingSub?.subId === s.id ? (
                                                <div className="flex gap-2 items-center flex-1">
                                                    <ImageUploadButton url={editSubImage} onChange={setEditSubImage} disabled={uploading} />
                                                    <div className="flex-1 flex items-center gap-1.5">
                                                        <input className="input-field py-1 text-sm flex-1" value={isRTL ? editSubNameAr : editSubName} onChange={e => isRTL ? setEditSubNameAr(e.target.value) : setEditSubName(e.target.value)} />
                                                        <input type="number" min="0" max="100" className="input-field py-1 text-sm w-14" placeholder="%" value={editSubDiscount} onChange={e => setEditSubDiscount(e.target.value ? Number(e.target.value) : "")} />
                                                        <button onClick={saveEditSub} disabled={isSaving} className="btn-icon w-6 h-6 text-green-500 disabled:opacity-50">✓</button>
                                                        <button onClick={() => setEditingSub(null)} disabled={isSaving} className="btn-icon w-6 h-6 text-red-400 disabled:opacity-50">✗</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex items-center gap-3">
                                                        {s.imageUrl ? (
                                                            <img src={s.imageUrl} alt={s.name} className="w-8 h-8 rounded-lg object-cover border" style={{ borderColor: 'var(--border-default)' }} />
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm border" style={{ background: 'var(--bg-surface-secondary)', borderColor: 'var(--border-default)' }}>📂</div>
                                                        )}
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{isRTL ? s.nameAr : s.name}</span>
                                                            {s.discount ? <span className="w-fit mt-0.5 px-1.5 py-0.5 rounded-md bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[9px] font-bold border border-red-200 dark:border-red-800/50">-{s.discount}%</span> : null}
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => startEditSub(selectedMain, s)} className="btn-icon w-8 h-8 text-xs" style={{ color: 'var(--text-muted)' }} aria-label={isRTL ? 'تعديل' : 'Edit'}>✏️</button>
                                                        <button onClick={() => deleteSubGroup(selectedMain, s.id)} className="btn-icon w-8 h-8 text-xs text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20" aria-label={isRTL ? 'حذف' : 'Delete'}>🗑️</button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

// ── Manage Units Modal ──
interface UnitsProps { dict: any; locale: string; units: Unit[]; setUnits: (u: Unit[]) => void; onClose: () => void; }

export const ManageUnitsModal = memo(function ManageUnitsModal({ dict, locale, units, setUnits, onClose }: UnitsProps) {
    const isRTL = locale === 'ar';
    const inv = dict.inventory;
    const [name, setName] = useState('');
    const [nameAr, setNameAr] = useState('');
    const [symbol, setSymbol] = useState('');
    const [editing, setEditing] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editNameAr, setEditNameAr] = useState('');
    const [editSymbol, setEditSymbol] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const queryClient = useQueryClient();

    const addUnit = async () => {
        if (!name && !nameAr) return;
        setIsSaving(true);
        try {
            await inventoryApi.createUnit({
                name: name || nameAr,
                name_ar: nameAr || name,
                symbol: symbol || undefined
            });
            queryClient.invalidateQueries({ queryKey: ['units'] });
            setName(''); setNameAr(''); setSymbol('');
        } finally {
            setIsSaving(false);
        }
    };
    
    const deleteUnit = async (id: string) => {
        await inventoryApi.deleteUnit(id);
        queryClient.invalidateQueries({ queryKey: ['units'] });
    };
    
    const startEdit = (u: Unit) => { setEditing(u.id); setEditName(u.name); setEditNameAr(u.nameAr); setEditSymbol(u.symbol); };
    
    const saveEdit = async () => {
        if (!editing) return;
        setIsSaving(true);
        try {
            await inventoryApi.updateUnit(editing, {
                name: editName || undefined,
                name_ar: editNameAr || undefined,
                symbol: editSymbol || undefined
            });
            queryClient.invalidateQueries({ queryKey: ['units'] });
            setEditing(null);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-content !max-w-lg">
                <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-default)' }}>
                    <div className="flex items-center gap-2"><span className="text-xl">📏</span><h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{inv.manageUnits}</h2></div>
                    <button onClick={onClose} className="btn-icon"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <div className="p-5">
                    <div className="flex gap-2 mb-4">
                        <input className="input-field py-2 text-sm flex-1" placeholder={isRTL ? 'اسم الوحدة' : 'Unit Name'} value={isRTL ? nameAr : name} onChange={e => isRTL ? setNameAr(e.target.value) : setName(e.target.value)} />
                        <input className="input-field py-2 text-sm w-20" placeholder={inv.unitSymbol} value={symbol} onChange={e => setSymbol(e.target.value)} />
                        <button onClick={addUnit} disabled={isSaving} className="btn-primary text-xs px-3 whitespace-nowrap disabled:opacity-50">+ {inv.addUnit}</button>
                    </div>
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                        {units.map(u => (
                            <div key={u.id} className="glass-card p-3 flex items-center justify-between group">
                                {editing === u.id ? (
                                    <div className="flex items-center gap-2 flex-1">
                                        <input className="input-field py-1 text-sm flex-1" value={isRTL ? editNameAr : editName} onChange={e => isRTL ? setEditNameAr(e.target.value) : setEditName(e.target.value)} />
                                        <input className="input-field py-1 text-sm w-16" value={editSymbol} onChange={e => setEditSymbol(e.target.value)} />
                                        <button onClick={saveEdit} disabled={isSaving} className="text-green-500 disabled:opacity-50">✓</button>
                                        <button onClick={() => setEditing(null)} disabled={isSaving} className="text-red-400 disabled:opacity-50">✗</button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{isRTL ? u.nameAr : u.name}</span>
                                            <span className="badge badge-info text-[10px]">{u.symbol}</span>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => startEdit(u)} className="btn-icon text-xs" style={{ color: 'var(--text-muted)' }} aria-label={isRTL ? 'تعديل' : 'Edit'}>✏️</button>
                                            <button onClick={() => deleteUnit(u.id)} className="btn-icon text-xs text-red-400" aria-label={isRTL ? 'حذف' : 'Delete'}>🗑️</button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
});

// ── Stock Movements Modal ──
interface MovementsProps { dict: any; locale: string; product: any; onClose: () => void; }

export const StockMovementsModal = memo(function StockMovementsModal({ dict, locale, product, onClose }: MovementsProps) {
    const isRTL = locale === 'ar';
    const inv = dict.inventory;

    const { data: movements = [] as StockMovement[], isLoading } = useQuery<StockMovement[]>({
        queryKey: ['stock-movements', product.id],
        queryFn: async () => {
            const res = await inventoryApi.getMovements({ product_id: product.id });
            if (!res.data?.data?.data) return [];
            return res.data.data.data.map((m: any) => ({
                id: m.id,
                type: m.type === 'in' ? 'incoming' : m.type === 'out' ? 'outgoing' : m.type,
                qty: parseFloat(m.quantity),
                date: new Date(m.created_at).toISOString().split('T')[0],
                note: m.notes || (m.reference_type ? `${m.reference_type} ${m.reference_id}` : '')
            })) as StockMovement[];
        }
    });

    const typeLabel = (t: string) => ({ incoming: inv.incoming, outgoing: inv.outgoing, adjustment: inv.adjustment, return: inv.returnMov }[t] || t);
    const typeBadge = (t: string) => ({ incoming: 'badge-success', outgoing: 'badge-danger', adjustment: 'badge-warning', return: 'badge-info' }[t] || 'badge-info');
    const typeIcon = (t: string) => ({ incoming: '📥', outgoing: '📤', adjustment: '🔧', return: '↩️' }[t] || '📦');

    const totalIn = movements.filter(m => m.qty > 0).reduce((a, m) => a + m.qty, 0);
    const totalOut = Math.abs(movements.filter(m => m.qty < 0).reduce((a, m) => a + m.qty, 0));

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-content !max-w-2xl">
                <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-default)' }}>
                    <div className="flex items-center gap-2"><span className="text-xl">📊</span><h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{inv.stockMovements}</h2></div>
                    <button onClick={onClose} className="btn-icon"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <div className="p-5">
                    {/* Product Info */}
                    <div className="glass-card p-4 mb-5 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{isRTL ? product.nameAr : product.name}</p>
                            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{product.code}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-center"><p className="text-xs" style={{ color: 'var(--text-muted)' }}>{inv.stock}</p><p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{product.stock}</p></div>
                        </div>
                    </div>

                    {/* Summary cards */}
                    <div className="grid grid-cols-3 gap-3 mb-5">
                        <div className="glass-card p-3 text-center">
                            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>📥 {inv.incoming}</p>
                            <p className="text-lg font-bold text-green-500">+{totalIn}</p>
                        </div>
                        <div className="glass-card p-3 text-center">
                            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>📤 {inv.outgoing}</p>
                            <p className="text-lg font-bold text-red-400">-{totalOut}</p>
                        </div>
                        <div className="glass-card p-3 text-center">
                            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>📊 {isRTL ? 'الصافي' : 'Net'}</p>
                            <p className="text-lg font-bold text-primary-400">+{totalIn - totalOut}</p>
                        </div>
                    </div>

                    {/* Movement History */}
                    <table className="data-table text-sm">
                        <thead><tr><th>#</th><th>{inv.movementType}</th><th>{inv.movementQty}</th><th>{inv.movementDate}</th><th>{inv.movementNote}</th></tr></thead>
                        <tbody>
                            {movements.map((m, i) => (
                                <tr key={m.id}>
                                    <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                                    <td><span className="flex items-center gap-1.5"><span>{typeIcon(m.type)}</span><span className={`badge ${typeBadge(m.type)}`}>{typeLabel(m.type)}</span></span></td>
                                    <td><span className={`font-bold ${m.qty > 0 ? 'text-green-500' : 'text-red-400'}`}>{m.qty > 0 ? `+${m.qty}` : m.qty}</span></td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{m.date}</td>
                                    <td style={{ color: 'var(--text-muted)' }} className="text-xs">{m.note}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
});

// ── Barcode Print Modal ──
interface BarcodeProps { dict: any; locale: string; product: any; onClose: () => void; }

export const PrintBarcodeModal = memo(function PrintBarcodeModal({ dict, locale, product, onClose }: BarcodeProps) {
    const isRTL = locale === 'ar';
    const { currencySymbol } = useRegionalSettings();
    const [count, setCount] = useState(1);
    const [companyName, setCompanyName] = useState('');
    const [options, setOptions] = useState<LabelOptions>(DEFAULT_LABEL_OPTIONS);
    const { print, queue } = usePrintLabels();

    // Seed from saved global barcode settings.
    useEffect(() => {
        const { settingsApi } = require('@/lib/api');
        settingsApi.getSettings().then((res: any) => {
            const data = res.data?.data || res.data || {};
            setCompanyName(data.company_name || '');
            try {
                const s = data.barcode_settings ? JSON.parse(data.barcode_settings) : {};
                setOptions(o => ({
                    ...o,
                    type: s.barcode_default_type || o.type,
                    size: s.barcode_default_size || o.size,
                    showCompany: s.barcode_show_company ?? o.showCompany,
                    showPrice: s.barcode_show_price ?? o.showPrice,
                    showSku: s.barcode_show_sku ?? o.showSku,
                    showName: s.barcode_show_name ?? o.showName,
                    showValue: s.barcode_show_value ?? o.showValue,
                }));
            } catch (e) { /* ignore */ }
        }).catch(() => {});
    }, []);

    // Inventory list maps SKU -> `code`; price is `sellPrice`.
    const labelProduct: LabelProduct = {
        name: product.name,
        nameAr: product.nameAr,
        sku: product.code,
        barcode: product.barcode,
        price: typeof product.sellPrice === 'number' ? product.sellPrice : (parseFloat(product.sellPrice) || undefined),
    };

    const handlePrint = () => {
        const res = print([{ product: labelProduct, qty: count }]);
        if (!res.ok) toast.error(isRTL ? 'لا يوجد باركود/SKU لهذا المنتج' : 'No barcode/SKU for this product');
    };

    const Toggle = ({ k, label }: { k: keyof LabelOptions; label: string }) => (
        <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={options[k] as boolean} onChange={e => setOptions(o => ({ ...o, [k]: e.target.checked }))} />
            {label}
        </label>
    );

    return (
        <>
            <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
                <div className="modal-content !max-w-md">
                    <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-default)' }}>
                        <div className="flex items-center gap-2"><span className="text-xl">🏷️</span><h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{isRTL ? 'طباعة الباركود' : 'Print Barcode'}</h2></div>
                        <button onClick={onClose} className="btn-icon"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>

                    <div className="p-5 space-y-4">
                        {/* Live preview — reflects every toggle instantly */}
                        <div className="glass-card p-6 flex justify-center">
                            <ProductLabel product={labelProduct} options={options} companyName={companyName} currency={currencySymbol} isRTL={isRTL} preview />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{isRTL ? 'نوع الباركود' : 'Barcode Type'}</label>
                                <select className="select-field py-2 text-sm w-full" value={options.type} onChange={e => setOptions(o => ({ ...o, type: e.target.value as LabelOptions['type'] }))}>
                                    <option value="1D">1D (Code 128)</option>
                                    <option value="QR">2D (QR Code)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{isRTL ? 'مقاس الملصق' : 'Label Size'}</label>
                                <select className="select-field py-2 text-sm w-full" value={options.size} onChange={e => setOptions(o => ({ ...o, size: e.target.value as LabelOptions['size'] }))}>
                                    {LABEL_SIZE_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 border-t pt-4" style={{ borderColor: 'var(--border-default)' }}>
                            <Toggle k="showName" label={isRTL ? 'الاسم' : 'Name'} />
                            <Toggle k="showBarcode" label={isRTL ? 'الباركود' : 'Barcode'} />
                            <Toggle k="showValue" label={isRTL ? 'الرقم' : 'Number'} />
                            <Toggle k="showSku" label="SKU" />
                            <Toggle k="showPrice" label={isRTL ? 'السعر' : 'Price'} />
                            <Toggle k="showCompany" label={isRTL ? 'الشركة' : 'Company'} />
                        </div>

                        <div className="flex items-center gap-3 border-t pt-4" style={{ borderColor: 'var(--border-default)' }}>
                            <label className="text-sm font-medium flex-1" style={{ color: 'var(--text-secondary)' }}>{isRTL ? 'عدد الملصقات (النسخ)' : 'Number of Copies'}</label>
                            <input type="number" min="1" max="500" className="input-field py-2 text-sm w-24 text-center" value={count} onChange={e => setCount(Math.max(1, +e.target.value || 1))} />
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 p-5 border-t" style={{ borderColor: 'var(--border-default)' }}>
                        <button onClick={onClose} className="btn-secondary">{dict.common.cancel}</button>
                        <button onClick={handlePrint} className="btn-primary flex items-center gap-2">🖨️ {isRTL ? 'طباعة' : 'Print'}</button>
                    </div>
                </div>
            </div>
            <LabelPrintSheet queue={queue} options={options} companyName={companyName} currency={currencySymbol} isRTL={isRTL} />
        </>
    );
});

// ── Inventory Adjustment & Spoilage Modal ──
export interface AdjustmentProps { dict: any; locale: string; products: any[]; warehouses: any[]; onClose: () => void; onSave: (data: any) => Promise<void>; }

export const InventoryAdjustmentModal = memo(function InventoryAdjustmentModal({ dict, locale, products, warehouses, onClose, onSave }: AdjustmentProps) {
    const isRTL = locale === 'ar';
    const [warehouseId, setWarehouseId] = useState('');
    const [type, setType] = useState('reconciliation');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState<{ productId: string; actual: string }[]>([]);
    const [loading, setLoading] = useState(false);

    const addItem = () => setItems([...items, { productId: '', actual: '' }]);
    const updateItem = (index: number, field: string, value: string) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };
    const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!warehouseId || items.length === 0 || items.some(i => !i.productId || i.actual === '')) return toast.error(isRTL ? 'يرجى إكمال البيانات' : 'Please complete form');
        setLoading(true);
        try {
            await onSave({
                warehouse_id: warehouseId,
                type: type,
                date: date,
                notes: notes,
                items: items.map(i => ({ product_id: i.productId, actual_quantity: Number(i.actual) }))
            });
            onClose();
        } catch (err) {
            toast.error(isRTL ? 'حدث خطأ. يرجى مراجعة البيانات.' : 'Error occurred. Please review inputs.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-content !max-w-xl">
                <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-default)' }}>
                    <div className="flex items-center gap-2"><span className="text-xl">⚖️</span><h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{isRTL ? 'تسوية جرد / هالك' : 'Inventory Adjustments'}</h2></div>
                    <button type="button" onClick={onClose} className="btn-icon"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{isRTL ? 'المستودع' : 'Warehouse'}</label>
                            <select className="select-field py-2 text-sm w-full" value={warehouseId} onChange={e => setWarehouseId(e.target.value)} required>
                                <option value="">{isRTL ? 'اختر المستودع' : 'Select Warehouse'}</option>
                                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{isRTL ? 'النوع' : 'Type'}</label>
                            <select className="select-field py-2 text-sm w-full" value={type} onChange={e => setType(e.target.value)}>
                                <option value="reconciliation">{isRTL ? 'تسوية كميات' : 'Reconciliation'}</option>
                                <option value="spoilage">{isRTL ? 'تسجيل هالك / تالف' : 'Spoilage'}</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="pt-4 border-t" style={{ borderColor: 'var(--border-default)' }}>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{isRTL ? 'الأصناف' : 'Items'}</label>
                            <button type="button" onClick={addItem} className="text-xs text-primary-500 font-bold">+ {isRTL ? 'إضافة صنف' : 'Add Item'}</button>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {items.map((item, index) => (
                                <div key={index} className="flex gap-2 items-center p-2 rounded-lg" style={{ background: 'var(--bg-surface-secondary)' }}>
                                    <select className="select-field py-1 text-sm flex-1" value={item.productId} onChange={e => updateItem(index, 'productId', e.target.value)} required>
                                        <option value="">{isRTL ? 'اختر الصنف' : 'Product'}</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{isRTL ? p.name_ar : p.name}</option>)}
                                    </select>
                                    <input type="number" step="0.001" placeholder={isRTL ? 'الكمية الفعلية' : 'Actual'} className="input-field py-1 text-sm w-24" value={item.actual} onChange={e => updateItem(index, 'actual', e.target.value)} required />
                                    <button type="button" onClick={() => removeItem(index)} className="btn-icon text-red-500 text-xs shadow-none" aria-label={isRTL ? 'حذف' : 'Delete'}>🗑️</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={onClose} className="btn-secondary">{isRTL ? 'إلغاء' : 'Cancel'}</button>
                        <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">✅ {isRTL ? 'تنفيذ التسوية' : 'Confirm'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
});

// ── Product Assembly Modal ──
export interface AssemblyProps { dict: any; locale: string; products: any[]; warehouses: any[]; onClose: () => void; onSave: (data: any) => Promise<void>; }

export const AssembleProductModal = memo(function AssembleProductModal({ dict, locale, products, warehouses, onClose, onSave }: AssemblyProps) {
    const isRTL = locale === 'ar';
    const [warehouseId, setWarehouseId] = useState('');
    const [productId, setProductId] = useState('');
    const [type, setType] = useState('assemble');
    const [quantity, setQuantity] = useState('1');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!warehouseId || !productId || Number(quantity) <= 0) return toast.error(isRTL ? 'بيانات غير صحيحة' : 'Invalid data');
        setLoading(true);
        try {
            await onSave({ warehouse_id: warehouseId, product_id: productId, type, quantity: Number(quantity) });
            onClose();
        } catch (err) {
            toast.error(isRTL ? 'حدث خطأ (ربما أرصدة غير كافية أو مكوّنات غير معرّفة)' : 'Error (Insufficient balance or undefined BOM)');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-content !max-w-md">
                <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-default)' }}>
                    <div className="flex items-center gap-2"><span className="text-xl">⚙️</span><h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{isRTL ? 'تجميع / تفكيك' : 'Assemble / Disassemble'}</h2></div>
                    <button type="button" onClick={onClose} className="btn-icon"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{isRTL ? 'العملية' : 'Operation'}</label>
                        <select className="select-field py-2 text-sm w-full" value={type} onChange={e => setType(e.target.value)}>
                            <option value="assemble">{isRTL ? 'تجميع منتج (سحب خام)' : 'Assemble'}</option>
                            <option value="disassemble">{isRTL ? 'تفكيك منتج (رد خام)' : 'Disassemble'}</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{isRTL ? 'المستودع' : 'Warehouse'}</label>
                        <select className="select-field py-2 text-sm w-full" value={warehouseId} onChange={e => setWarehouseId(e.target.value)} required>
                            <option value="">{isRTL ? 'اختر المستودع' : 'Warehouse'}</option>
                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{isRTL ? 'الصنف المجمّع' : 'Composite Product'}</label>
                        <select className="select-field py-2 text-sm w-full" value={productId} onChange={e => setProductId(e.target.value)} required>
                            <option value="">{isRTL ? 'اختر الصنف' : 'Product'}</option>
                            {products.map(p => <option key={p.id} value={p.id}>{isRTL ? p.name_ar : p.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{isRTL ? 'الكمية' : 'Quantity'}</label>
                        <input type="number" min="0.001" step="0.001" className="input-field py-2 text-sm w-full text-center font-bold" value={quantity} onChange={e => setQuantity(e.target.value)} required />
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={onClose} className="btn-secondary">{isRTL ? 'إلغاء' : 'Cancel'}</button>
                        <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">⚙️ {isRTL ? 'تنفيذ' : 'Execute'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
});
