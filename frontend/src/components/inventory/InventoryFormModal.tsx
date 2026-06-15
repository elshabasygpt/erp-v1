import React, { memo } from 'react';
import type { MainGroup, Unit } from './InventoryModals';
import type { Product } from './hooks/useInventoryData';

interface InventoryFormModalProps {
    isRTL: boolean;
    inv: any;
    common: any;
    showAddEdit: boolean;
    setShowAddEdit: (b: boolean) => void;
    editingProduct: Product | null;
    form: any;
    setForm: any;
    saveProduct: () => void;
    generateBarcode: () => string;
    groups: MainGroup[];
    units: Unit[];
    setPromptModal: (v: any) => void;
    updateCostAndProfit: (cost: number, profit: number) => void;
}

const InventoryFormModal = memo(function InventoryFormModal({
    isRTL, inv, common, showAddEdit, setShowAddEdit, editingProduct, form, setForm,
    saveProduct, generateBarcode, groups, units, setPromptModal, updateCostAndProfit
}: InventoryFormModalProps) {
    if (!showAddEdit) return null;
    
    const availableSubs = form.mainGroupId ? groups.find(g => g.id === form.mainGroupId)?.subGroups || [] : [];
    const lblCls = "block text-xs font-medium mb-1.5 uppercase tracking-wider";

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAddEdit(false)}>
            <div className="modal-content !max-w-3xl">
                <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-default)' }}>
                    <div className="flex items-center gap-2"><span className="text-xl">{editingProduct ? '✏️' : '➕'}</span><h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{editingProduct ? inv.editProduct : inv.addProduct}</h2></div>
                    <button onClick={() => setShowAddEdit(false)} className="btn-icon"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
                    {/* Product Image Section */}
                    <div>
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            {isRTL ? 'صورة المنتج' : 'Product Image'}
                        </h3>
                        <div className="flex items-center gap-4 p-4 rounded-xl border border-dashed" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface-secondary)' }}>
                            <div className="relative w-24 h-24 rounded-lg overflow-hidden flex items-center justify-center text-4xl border" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-input)' }}>
                                {form.imageUrl ? (
                                    <img src={form.imageUrl} alt="Product preview" className="w-full h-full object-cover" />
                                ) : (
                                    '📦'
                                )}
                                {form.imageUrl && (
                                    <button 
                                        onClick={() => setForm((f:any) => ({ ...f, imageUrl: '' }))}
                                        className="absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] hover:bg-red-600 transition-colors"
                                        type="button"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                            <div className="flex-1 space-y-1">
                                <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                                    {isRTL ? 'تحميل صورة للمنتج' : 'Upload product image'}
                                </p>
                                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                    {isRTL ? 'صيغ PNG, JPG, WEBP حتى 2 ميجابايت' : 'PNG, JPG, WEBP formats up to 2MB'}
                                </p>
                                <label className="inline-block mt-2">
                                    <span className="btn-secondary text-xs px-3 py-1.5 cursor-pointer">
                                        {isRTL ? 'اختر ملف' : 'Choose File'}
                                    </span>
                                    <input 
                                        type="file" 
                                        className="hidden" 
                                        accept="image/png, image/jpeg, image/webp"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onload = (ev) => setForm((f:any) => ({ ...f, imageUrl: ev.target?.result as string }));
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                    />
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <div>
                            <label className={lblCls} style={{ color: 'var(--text-secondary)' }}>{inv.itemCode}</label>
                            <input className="input-field w-full font-mono" value={form.code} onChange={e => setForm((f:any) => ({ ...f, code: e.target.value }))} readOnly />
                        </div>
                        <div>
                            <label className={lblCls} style={{ color: 'var(--text-secondary)' }}>{inv.barcode}</label>
                            <div className="flex gap-2">
                                <input className="input-field w-full font-mono" value={form.barcode} onChange={e => setForm((f:any) => ({ ...f, barcode: e.target.value }))} />
                                <button onClick={() => setForm((f:any) => ({ ...f, barcode: generateBarcode() }))} className="btn-secondary p-2" title="Generate Barcode">🔄</button>
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label className={lblCls} style={{ color: 'var(--text-secondary)' }}>{inv.itemNameAr} <span className="text-red-500">*</span></label>
                            <input className="input-field w-full" value={form.nameAr} onChange={e => setForm((f:any) => ({ ...f, nameAr: e.target.value }))} placeholder={isRTL ? 'ادخل اسم المنتج' : 'Enter product name'} />
                        </div>
                        <div className="md:col-span-2">
                            <label className={lblCls} style={{ color: 'var(--text-secondary)' }}>{inv.itemNameEn}</label>
                            <input className="input-field w-full" value={form.name} onChange={e => setForm((f:any) => ({ ...f, name: e.target.value }))} />
                        </div>

                        <div>
                            <label className={lblCls} style={{ color: 'var(--text-secondary)' }}>{inv.mainGroup}</label>
                            <div className="flex gap-2">
                                <select className="select-field w-full" value={form.mainGroupId} onChange={e => setForm((f:any) => ({ ...f, mainGroupId: e.target.value, subGroupId: '' }))}>
                                    <option value="" disabled>{isRTL ? 'اختر مجموعة' : 'Select Group'}</option>
                                    {groups.map(g => <option key={g.id} value={g.id}>{isRTL ? g.nameAr : g.name}</option>)}
                                </select>
                                <button onClick={() => setPromptModal({ isOpen: true, type: 'main', value: '' })} className="btn-secondary p-2">➕</button>
                            </div>
                        </div>
                        <div>
                            <label className={lblCls} style={{ color: 'var(--text-secondary)' }}>{inv.subGroup}</label>
                            <div className="flex gap-2">
                                <select className="select-field w-full" value={form.subGroupId} onChange={e => setForm((f:any) => ({ ...f, subGroupId: e.target.value }))} disabled={!form.mainGroupId}>
                                    <option value="">{isRTL ? 'بدون مجموعة فرعية' : 'No Subgroup'}</option>
                                    {availableSubs.map(s => <option key={s.id} value={s.id}>{isRTL ? s.nameAr : s.name}</option>)}
                                </select>
                                <button disabled={!form.mainGroupId} onClick={() => setPromptModal({ isOpen: true, type: 'sub', value: '' })} className="btn-secondary p-2 disabled:opacity-50">➕</button>
                            </div>
                        </div>

                        <div>
                            <label className={lblCls} style={{ color: 'var(--text-secondary)' }}>{inv.unit}</label>
                            <div className="flex gap-2">
                                <select className="select-field w-full" value={form.unitId} onChange={e => setForm((f:any) => ({ ...f, unitId: e.target.value }))}>
                                    <option value="" disabled>{isRTL ? 'اختر وحدة' : 'Select Unit'}</option>
                                    {units.map(u => <option key={u.id} value={u.id}>{isRTL ? u.nameAr : u.name} ({u.symbol})</option>)}
                                </select>
                                <button onClick={() => setPromptModal({ isOpen: true, type: 'unit', value: '' })} className="btn-secondary p-2">➕</button>
                            </div>
                        </div>
                        <div>
                            <label className={lblCls} style={{ color: 'var(--text-secondary)' }}>{inv.minStock}</label>
                            <input type="number" min="0" className="input-field w-full" value={form.minStock} onChange={e => setForm((f:any) => ({ ...f, minStock: parseInt(e.target.value) || 0 }))} />
                        </div>
                    </div>

                    <div className="p-4 rounded-xl border border-dashed" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface-secondary)' }}>
                        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>💰 {inv.pricing}</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className={lblCls} style={{ color: 'var(--text-secondary)' }}>{inv.costPrice}</label>
                                <input type="number" step="0.01" className="input-field w-full" value={form.costPrice} onChange={e => updateCostAndProfit(parseFloat(e.target.value) || 0, form.profitPercent)} />
                            </div>
                            <div>
                                <label className={lblCls} style={{ color: 'var(--text-secondary)' }}>{inv.profitPercent} (%)</label>
                                <input type="number" className="input-field w-full" value={form.profitPercent} onChange={e => updateCostAndProfit(form.costPrice, parseFloat(e.target.value) || 0)} />
                            </div>
                            <div>
                                <label className={lblCls} style={{ color: 'var(--text-secondary)' }}>{inv.sellPrice}</label>
                                <input type="number" step="0.01" className="input-field w-full" value={form.sellPrice} onChange={e => {
                                    const sp = parseFloat(e.target.value) || 0;
                                    setForm((f:any) => ({ ...f, sellPrice: sp, profitPercent: form.costPrice ? Math.round(((sp - form.costPrice) / form.costPrice) * 100) : 0, wholesalePrice: sp * 0.9, semiWholesalePrice: sp * 0.95 }));
                                }} />
                            </div>
                            <div>
                                <label className={lblCls} style={{ color: 'var(--text-secondary)' }}>{inv.discount} (%)</label>
                                <input type="number" min="0" max="100" className="input-field w-full" value={form.discount} onChange={e => setForm((f:any) => ({ ...f, discount: parseFloat(e.target.value) || 0 }))} />
                            </div>
                            <div className="col-span-2">
                                <label className={lblCls} style={{ color: 'var(--text-secondary)' }}>{inv.wholesalePrice}</label>
                                <input type="number" step="0.01" className="input-field w-full" value={form.wholesalePrice} onChange={e => setForm((f:any) => ({ ...f, wholesalePrice: parseFloat(e.target.value) || 0 }))} />
                            </div>
                            <div className="col-span-2">
                                <label className={lblCls} style={{ color: 'var(--text-secondary)' }}>{inv.semiWholesalePrice}</label>
                                <input type="number" step="0.01" className="input-field w-full" value={form.semiWholesalePrice} onChange={e => setForm((f:any) => ({ ...f, semiWholesalePrice: parseFloat(e.target.value) || 0 }))} />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className={lblCls} style={{ color: 'var(--text-secondary)' }}>{inv.description}</label>
                        <textarea className="input-field w-full min-h-[80px] resize-y" value={form.description} onChange={e => setForm((f:any) => ({ ...f, description: e.target.value }))} />
                    </div>
                </div>
                <div className="p-5 border-t flex justify-end gap-3" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface-secondary)' }}>
                    <button onClick={() => setShowAddEdit(false)} className="btn-secondary px-6">{common.cancel}</button>
                    <button onClick={saveProduct} disabled={!form.name && !form.nameAr} className="btn-primary px-8 disabled:opacity-50">{common.save}</button>
                </div>
            </div>
        </div>
    );
});

export default InventoryFormModal;
