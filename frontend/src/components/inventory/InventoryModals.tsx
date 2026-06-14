'use client';
import { useState } from 'react';

// ── Types ──
export interface MainGroup { id: string; name: string; nameAr: string; subGroups: SubGroup[]; imageUrl?: string; discount?: number; }
export interface SubGroup { id: string; name: string; nameAr: string; imageUrl?: string; discount?: number; }
export interface Unit { id: string; name: string; nameAr: string; symbol: string; }
export interface StockMovement { id: string; type: 'incoming' | 'outgoing' | 'adjustment' | 'return'; qty: number; date: string; note: string; }

// ── Manage Groups Modal ──
interface GroupsProps { dict: any; locale: string; groups: MainGroup[]; setGroups: (g: MainGroup[]) => void; onClose: () => void; }

export function ManageGroupsModal({ dict, locale, groups, setGroups, onClose }: GroupsProps) {
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

    const [uploading, setUploading] = useState(false);

    const handleImageUpload = async (file: File) => {
        setUploading(true);
        try {
            const { inventoryApi } = await import('@/lib/api');
            const res = await inventoryApi.uploadProductImage(file);
            return res.data?.data?.image_url;
        } catch (err) {
            console.error("Failed to upload image", err);
            alert(isRTL ? "فشل تحميل الصورة" : "Failed to upload image");
            return null;
        } finally {
            setUploading(false);
        }
    };

    const ImageUploadButton = ({ url, onChange, disabled }: { url: string; onChange: (url: string) => void; disabled?: boolean }) => (
        <label className={`relative w-8 h-8 rounded-lg border flex items-center justify-center cursor-pointer overflow-hidden flex-shrink-0 transition-colors ${url ? 'border-primary-500' : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'}`} style={{ background: 'var(--bg-input)' }}>
            {url ? <img src={url} alt="img" className="w-full h-full object-cover" /> : <span className="text-[10px] text-gray-400">🖼️</span>}
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
                >✕</button>
            )}
        </label>
    );

    const addMainGroup = () => {
        if (!newMain && !newMainAr) return;
        setGroups([...groups, { 
            id: `MG-${Date.now()}`, 
            name: newMain || newMainAr, 
            nameAr: newMainAr || newMain, 
            subGroups: [],
            imageUrl: newMainImage || undefined,
            discount: newMainDiscount === '' ? undefined : Number(newMainDiscount)
        }]);
        setNewMain(''); setNewMainAr(''); setNewMainImage(''); setNewMainDiscount('');
    };

    const deleteMainGroup = (id: string) => setGroups(groups.filter(g => g.id !== id));
    
    const startEditMain = (g: MainGroup) => { 
        setEditingMain(g.id); setEditMainName(g.name); setEditMainNameAr(g.nameAr); 
        setEditMainImage(g.imageUrl || ''); setEditMainDiscount(g.discount !== undefined ? g.discount : '');
    };

    const saveEditMain = () => {
        if (!editingMain) return;
        setGroups(groups.map(g => g.id === editingMain ? { 
            ...g, 
            name: editMainName || g.name, 
            nameAr: editMainNameAr || g.nameAr,
            imageUrl: editMainImage || undefined,
            discount: editMainDiscount === '' ? undefined : Number(editMainDiscount)
        } : g));
        setEditingMain(null);
    };

    const addSubGroup = () => {
        if (!selectedMain || (!newSub && !newSubAr)) return;
        setGroups(groups.map(g => g.id === selectedMain ? { 
            ...g, 
            subGroups: [...g.subGroups, { 
                id: `SG-${Date.now()}`, 
                name: newSub || newSubAr, 
                nameAr: newSubAr || newSub,
                imageUrl: newSubImage || undefined,
                discount: newSubDiscount === '' ? undefined : Number(newSubDiscount)
            }] 
        } : g));
        setNewSub(''); setNewSubAr(''); setNewSubImage(''); setNewSubDiscount('');
    };

    const deleteSubGroup = (mainId: string, subId: string) => setGroups(groups.map(g => g.id === mainId ? { ...g, subGroups: g.subGroups.filter(s => s.id !== subId) } : g));
    
    const startEditSub = (mainId: string, sub: SubGroup) => { 
        setEditingSub({ mainId, subId: sub.id }); setEditSubName(sub.name); setEditSubNameAr(sub.nameAr); 
        setEditSubImage(sub.imageUrl || ''); setEditSubDiscount(sub.discount !== undefined ? sub.discount : '');
    };

    const saveEditSub = () => {
        if (!editingSub) return;
        setGroups(groups.map(g => g.id === editingSub.mainId ? { 
            ...g, 
            subGroups: g.subGroups.map(s => s.id === editingSub.subId ? { 
                ...s, 
                name: editSubName || s.name, 
                nameAr: editSubNameAr || s.nameAr,
                imageUrl: editSubImage || undefined,
                discount: editSubDiscount === '' ? undefined : Number(editSubDiscount)
            } : s) 
        } : g));
        setEditingSub(null);
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
                                <button onClick={addMainGroup} className="btn-primary text-xs px-3 whitespace-nowrap">+ {inv.addGroup}</button>
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
                                                <button onClick={saveEditMain} className="btn-icon w-6 h-6 text-green-500">✓</button>
                                                <button onClick={() => setEditingMain(null)} className="btn-icon w-6 h-6 text-red-400">✗</button>
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
                                                <button onClick={() => startEditMain(g)} className="btn-icon w-8 h-8 text-xs" style={{ color: 'var(--text-muted)' }}>✏️</button>
                                                <button onClick={() => deleteMainGroup(g.id)} className="btn-icon w-8 h-8 text-xs text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">🗑️</button>
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
                                        <button onClick={addSubGroup} className="btn-primary text-xs px-3 whitespace-nowrap">+ {inv.addSubGroup}</button>
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
                                                        <button onClick={saveEditSub} className="btn-icon w-6 h-6 text-green-500">✓</button>
                                                        <button onClick={() => setEditingSub(null)} className="btn-icon w-6 h-6 text-red-400">✗</button>
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
                                                        <button onClick={() => startEditSub(selectedMain, s)} className="btn-icon w-8 h-8 text-xs" style={{ color: 'var(--text-muted)' }}>✏️</button>
                                                        <button onClick={() => deleteSubGroup(selectedMain, s.id)} className="btn-icon w-8 h-8 text-xs text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">🗑️</button>
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
}

// ── Manage Units Modal ──
interface UnitsProps { dict: any; locale: string; units: Unit[]; setUnits: (u: Unit[]) => void; onClose: () => void; }

export function ManageUnitsModal({ dict, locale, units, setUnits, onClose }: UnitsProps) {
    const isRTL = locale === 'ar';
    const inv = dict.inventory;
    const [name, setName] = useState('');
    const [nameAr, setNameAr] = useState('');
    const [symbol, setSymbol] = useState('');
    const [editing, setEditing] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editNameAr, setEditNameAr] = useState('');
    const [editSymbol, setEditSymbol] = useState('');

    const addUnit = () => {
        if (!name && !nameAr) return;
        setUnits([...units, { id: `U-${Date.now()}`, name: name || nameAr, nameAr: nameAr || name, symbol }]);
        setName(''); setNameAr(''); setSymbol('');
    };
    const deleteUnit = (id: string) => setUnits(units.filter(u => u.id !== id));
    const startEdit = (u: Unit) => { setEditing(u.id); setEditName(u.name); setEditNameAr(u.nameAr); setEditSymbol(u.symbol); };
    const saveEdit = () => {
        if (!editing) return;
        setUnits(units.map(u => u.id === editing ? { ...u, name: editName || u.name, nameAr: editNameAr || u.nameAr, symbol: editSymbol } : u));
        setEditing(null);
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
                        <button onClick={addUnit} className="btn-primary text-xs px-3 whitespace-nowrap">+ {inv.addUnit}</button>
                    </div>
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                        {units.map(u => (
                            <div key={u.id} className="glass-card p-3 flex items-center justify-between group">
                                {editing === u.id ? (
                                    <div className="flex items-center gap-2 flex-1">
                                        <input className="input-field py-1 text-sm flex-1" value={isRTL ? editNameAr : editName} onChange={e => isRTL ? setEditNameAr(e.target.value) : setEditName(e.target.value)} />
                                        <input className="input-field py-1 text-sm w-16" value={editSymbol} onChange={e => setEditSymbol(e.target.value)} />
                                        <button onClick={saveEdit} className="text-green-500">✓</button>
                                        <button onClick={() => setEditing(null)} className="text-red-400">✗</button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{isRTL ? u.nameAr : u.name}</span>
                                            <span className="badge badge-info text-[10px]">{u.symbol}</span>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => startEdit(u)} className="btn-icon text-xs" style={{ color: 'var(--text-muted)' }}>✏️</button>
                                            <button onClick={() => deleteUnit(u.id)} className="btn-icon text-xs text-red-400">🗑️</button>
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
}

// ── Stock Movements Modal ──
interface MovementsProps { dict: any; locale: string; product: any; onClose: () => void; }

export function StockMovementsModal({ dict, locale, product, onClose }: MovementsProps) {
    const isRTL = locale === 'ar';
    const inv = dict.inventory;

    const movements: StockMovement[] = [
        { id: 'M1', type: 'incoming', qty: 50, date: '2026-02-23', note: isRTL ? 'فاتورة شراء PO-101' : 'Purchase Order PO-101' },
        { id: 'M2', type: 'outgoing', qty: -8, date: '2026-02-22', note: isRTL ? 'فاتورة بيع INV-445' : 'Sales Invoice INV-445' },
        { id: 'M3', type: 'outgoing', qty: -3, date: '2026-02-21', note: isRTL ? 'فاتورة بيع INV-442' : 'Sales Invoice INV-442' },
        { id: 'M4', type: 'return', qty: 2, date: '2026-02-20', note: isRTL ? 'مرتجع مبيعات RET-12' : 'Sales Return RET-12' },
        { id: 'M5', type: 'adjustment', qty: -1, date: '2026-02-18', note: isRTL ? 'تعديل جرد' : 'Stock count adjustment' },
        { id: 'M6', type: 'incoming', qty: 30, date: '2026-02-15', note: isRTL ? 'فاتورة شراء PO-098' : 'Purchase Order PO-098' },
        { id: 'M7', type: 'outgoing', qty: -12, date: '2026-02-14', note: isRTL ? 'فاتورة بيع INV-430' : 'Sales Invoice INV-430' },
        { id: 'M8', type: 'incoming', qty: 25, date: '2026-02-10', note: isRTL ? 'فاتورة شراء PO-092' : 'Purchase Order PO-092' },
    ];

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
}

// ── Barcode Print Modal ──
interface BarcodeProps { dict: any; locale: string; product: any; onClose: () => void; }

export function PrintBarcodeModal({ dict, locale, product, onClose }: BarcodeProps) {
    const isRTL = locale === 'ar';
    const inv = dict.inventory;
    const [count, setCount] = useState(1);

    const handlePrint = () => {
        const printWindow = window.open('', '_blank', 'width=400,height=600');
        if (!printWindow) return;
        const barcodeLines = product.barcode.split('').map((c: string, i: number) => {
            const w = parseInt(c, 10) % 4 + 1;
            return `<div style="display:inline-block;width:${w}px;height:60px;background:${i % 2 === 0 ? '#000' : '#fff'}"></div>`;
        }).join('');
        let content = '';
        for (let i = 0; i < count; i++) {
            content += `<div style="border:1px dashed #ccc;padding:12px;margin:8px;text-align:center;width:250px;display:inline-block">
                <div style="font-weight:bold;font-size:12px;margin-bottom:6px">${isRTL ? product.nameAr : product.name}</div>
                <div style="margin:8px auto;overflow:hidden;white-space:nowrap">${barcodeLines}</div>
                <div style="font-family:monospace;font-size:11px;letter-spacing:2px">${product.barcode}</div>
                <div style="font-size:11px;margin-top:4px;font-weight:bold">${product.sellPrice} SAR</div>
            </div>`;
        }
        printWindow.document.write(`<html><head><title>Barcode</title></head><body style="font-family:Arial;display:flex;flex-wrap:wrap;justify-content:center">${content}<script>setTimeout(()=>{window.print();window.close()},500)<\/script></body></html>`);
        printWindow.document.close();
    };

    const barcodeVisual = product.barcode.split('').map((c: string, i: number) => (
        <div key={i} style={{ display: 'inline-block', width: `${parseInt(c, 10) % 4 + 1}px`, height: '50px', background: i % 2 === 0 ? 'var(--text-primary)' : 'transparent' }} />
    ));

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-content !max-w-md">
                <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-default)' }}>
                    <div className="flex items-center gap-2"><span className="text-xl">🏷️</span><h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{inv.printBarcode}</h2></div>
                    <button onClick={onClose} className="btn-icon"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <div className="p-5 space-y-4">
                    <div className="glass-card p-6 text-center">
                        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>{isRTL ? product.nameAr : product.name}</p>
                        <div className="flex justify-center mb-2 overflow-hidden">{barcodeVisual}</div>
                        <p className="font-mono text-sm tracking-[3px]" style={{ color: 'var(--text-secondary)' }}>{product.barcode}</p>
                        <p className="text-sm font-bold mt-2 text-primary-400">{product.sellPrice} SAR</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{inv.printCount}</label>
                        <input type="number" min="1" max="100" className="input-field py-2 text-sm w-24" value={count} onChange={e => setCount(Math.max(1, +e.target.value || 1))} />
                    </div>
                </div>
                <div className="flex items-center justify-end gap-3 p-5 border-t" style={{ borderColor: 'var(--border-default)' }}>
                    <button onClick={onClose} className="btn-secondary">{dict.common.cancel}</button>
                    <button onClick={handlePrint} className="btn-primary flex items-center gap-2">🖨️ {inv.print}</button>
                </div>
            </div>
        </div>
    );
}

// ── Inventory Adjustment & Spoilage Modal ──
export interface AdjustmentProps { dict: any; locale: string; products: any[]; warehouses: any[]; onClose: () => void; onSave: (data: any) => Promise<void>; }

export function InventoryAdjustmentModal({ dict, locale, products, warehouses, onClose, onSave }: AdjustmentProps) {
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
        if (!warehouseId || items.length === 0 || items.some(i => !i.productId || i.actual === '')) return alert(isRTL ? 'يرجى إكمال البيانات' : 'Please complete form');
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
            alert(isRTL ? 'حدث خطأ. يرجى مراجعة البيانات.' : 'Error occurred. Please review inputs.');
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
                                    <button type="button" onClick={() => removeItem(index)} className="btn-icon text-red-500 text-xs shadow-none">🗑️</button>
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
}

// ── Product Assembly Modal ──
export interface AssemblyProps { dict: any; locale: string; products: any[]; warehouses: any[]; onClose: () => void; onSave: (data: any) => Promise<void>; }

export function AssembleProductModal({ dict, locale, products, warehouses, onClose, onSave }: AssemblyProps) {
    const isRTL = locale === 'ar';
    const [warehouseId, setWarehouseId] = useState('');
    const [productId, setProductId] = useState('');
    const [type, setType] = useState('assemble');
    const [quantity, setQuantity] = useState('1');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!warehouseId || !productId || Number(quantity) <= 0) return alert(isRTL ? 'بيانات غير صحيحة' : 'Invalid data');
        setLoading(true);
        try {
            await onSave({ warehouse_id: warehouseId, product_id: productId, type, quantity: Number(quantity) });
            onClose();
        } catch (err) {
            alert(isRTL ? 'حدث خطأ (ربما أرصدة غير كافية أو مكوّنات غير معرّفة)' : 'Error (Insufficient balance or undefined BOM)');
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
}
