import React, { memo, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import type { MainGroup, Unit } from './InventoryModals';
import type { Product } from './hooks/useInventoryData';
import { ProductCompatibilityTab } from './ProductCompatibilityTab';
import { ProductAlternativesTab } from './ProductAlternativesTab';
import { ProductComponentsTab } from './ProductComponentsTab';
import { CrossReferenceManagerModal } from './CrossReferenceManagerModal';
import { inventoryApi } from '@/lib/api';

type TabType = 'basic' | 'compatibility' | 'alternatives' | 'components';

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
    products?: Product[];
}

interface BrandOption { id: string; name: string; name_ar: string | null; image_url: string | null; country_of_origin: string | null; }

const InventoryFormModal = memo(function InventoryFormModal({
    isRTL, inv, common, showAddEdit, setShowAddEdit, editingProduct, form, setForm,
    saveProduct, generateBarcode, groups, units, setPromptModal, updateCostAndProfit, products = []
}: InventoryFormModalProps) {
    // ALL hooks must be declared before any conditional return (Rules of Hooks)
    const [activeTab, setActiveTab] = React.useState<TabType>('basic');
    const [brands, setBrands] = useState<BrandOption[]>([]);
    const [brandOpen, setBrandOpen] = useState(false);
    const [brandSearch, setBrandSearch] = useState('');
    const brandRef = React.useRef<HTMLDivElement>(null);
    const [showXrefModal, setShowXrefModal] = useState(false);

    // Close brand dropdown on outside click
    useEffect(() => {
        if (!brandOpen) return;
        const handler = (e: MouseEvent) => {
            if (brandRef.current && !brandRef.current.contains(e.target as Node)) setBrandOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [brandOpen]);

    // Reset tab when modal opens
    React.useEffect(() => {
        if (showAddEdit) { setActiveTab('basic'); setBrandOpen(false); setBrandSearch(''); }
    }, [showAddEdit]);

    // Fetch brands when modal opens
    useEffect(() => {
        if (!showAddEdit) return;
        inventoryApi.getBrands().then(res => {
            const data = res.data?.data ?? res.data ?? [];
            setBrands(Array.isArray(data) ? data : []);
        }).catch(() => {});
    }, [showAddEdit]);

    // Conditional return AFTER all hooks
    if (!showAddEdit) return null;

    const availableSubs = form.mainGroupId ? groups.find(g => g.id === form.mainGroupId)?.subGroups || [] : [];
    const lblCls = "block text-xs font-medium mb-1.5 uppercase tracking-wider";

    return (
        <>
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAddEdit(false)}>
            <div className="modal-content !max-w-3xl">
                <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-default)' }}>
                    <div className="flex items-center gap-2"><span className="text-xl">{editingProduct ? '✏️' : '➕'}</span><h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{editingProduct ? inv.editProduct : inv.addProduct}</h2></div>
                    <button onClick={() => setShowAddEdit(false)} className="btn-icon"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                
                <div className="px-5 pt-3 flex gap-4 border-b overflow-x-auto" style={{ borderColor: 'var(--border-default)' }}>
                    <button
                        className={`pb-2 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${activeTab === 'basic' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('basic')}
                    >
                        {isRTL ? 'البيانات الأساسية' : 'Basic Info'}
                    </button>
                    <button
                        className={`pb-2 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${activeTab === 'compatibility' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('compatibility')}
                    >
                        {isRTL ? 'التوافق مع السيارات' : 'Vehicle Compatibility'}
                        {!editingProduct && form.pendingVehicles?.length > 0 && (
                            <span className="mr-1 inline-flex items-center justify-center w-4 h-4 text-xs rounded-full bg-blue-500 text-white">{form.pendingVehicles.length}</span>
                        )}
                    </button>
                    {editingProduct && (
                        <button
                            className={`pb-2 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${activeTab === 'alternatives' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setActiveTab('alternatives')}
                        >
                            {isRTL ? 'القطع البديلة والمطابقات' : 'Cross-References'}
                        </button>
                    )}
                    {editingProduct && form.isKit && (
                        <button
                            className={`pb-2 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${activeTab === 'components' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setActiveTab('components')}
                        >
                            {isRTL ? 'مكونات الطقم' : 'Kit Components'}
                        </button>
                    )}
                </div>

                <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
                    {activeTab === 'basic' ? (
                        <>
                    {/* Product Image Section */}
                    <div>
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            {isRTL ? 'صورة المنتج' : 'Product Image'}
                        </h3>
                        <div className="flex items-center gap-4 p-4 rounded-xl border border-dashed" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface-secondary)' }}>
                            <div className="relative w-24 h-24 rounded-lg overflow-hidden flex items-center justify-center text-4xl border" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-input)' }}>
                                {form._uploadingImage ? (
                                    <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                                ) : form.imageUrl ? (
                                    <img src={form.imageUrl} alt="Product preview" className="w-full h-full object-cover" />
                                ) : (
                                    '📦'
                                )}
                                {form.imageUrl && !form._uploadingImage && (
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
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;

                                            if (file.size > 2 * 1024 * 1024) {
                                                toast.error(isRTL ? 'حجم الصورة أكبر من 2 ميجابايت' : 'Image larger than 2MB');
                                                return;
                                            }

                                            const localPreview = URL.createObjectURL(file);
                                            setForm((f: any) => ({ ...f, imageUrl: localPreview, _uploadingImage: true }));

                                            try {
                                                const res = await inventoryApi.uploadProductImage(file);
                                                const url = res.data?.data?.image_url || res.data?.image_url;
                                                if (!url) throw new Error('No URL returned');
                                                setForm((f: any) => ({ ...f, imageUrl: url, _uploadingImage: false }));
                                                URL.revokeObjectURL(localPreview);
                                            } catch {
                                                toast.error(isRTL ? 'فشل رفع الصورة' : 'Image upload failed');
                                                setForm((f: any) => ({ ...f, imageUrl: '', _uploadingImage: false }));
                                                URL.revokeObjectURL(localPreview);
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
                        
                        {/* Auto Parts Fields */}
                        <div className="col-span-1 md:col-span-2 border-t pt-4 mt-2" style={{ borderColor: 'var(--border-default)' }}>
                            <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{isRTL ? 'بيانات قطع الغيار' : 'Auto Parts Info'}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                <div>
                                    <label className={lblCls} style={{ color: 'var(--text-secondary)' }}>OEM Number</label>
                                    <div className="flex gap-2">
                                        <input className="input-field flex-1 font-mono" value={form.oemNumber || ''} onChange={e => setForm((f:any) => ({ ...f, oemNumber: e.target.value }))} placeholder="e.g. 1122334455" />
                                        {editingProduct && (
                                            <button
                                                type="button"
                                                onClick={() => setShowXrefModal(true)}
                                                className="flex-shrink-0 text-xs px-2.5 py-1.5 rounded-lg border font-medium whitespace-nowrap"
                                                style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }}
                                                title={isRTL ? 'إدارة أرقام بديلة' : 'Manage cross-reference numbers'}
                                            >
                                                {isRTL ? 'أرقام بديلة' : 'X-Refs'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className={lblCls} style={{ color: 'var(--text-secondary)' }}>Part Number (PN)</label>
                                    <input className="input-field w-full font-mono" value={form.partNumber || ''} onChange={e => setForm((f:any) => ({ ...f, partNumber: e.target.value }))} />
                                </div>
                                <div ref={brandRef} className="relative">
                                    <label className={lblCls} style={{ color: 'var(--text-secondary)' }}>Brand</label>
                                    {/* Custom brand dropdown with logo */}
                                    <button
                                        type="button"
                                        className="input-field w-full flex items-center gap-2 text-right cursor-pointer"
                                        onClick={() => { setBrandOpen(o => !o); setBrandSearch(''); }}
                                    >
                                        {(() => {
                                            const sel = brands.find(b => b.id === form.brandId);
                                            return sel ? (
                                                <>
                                                    {sel.image_url
                                                        ? <img src={sel.image_url} alt={sel.name} className="w-6 h-6 object-contain rounded flex-shrink-0" />
                                                        : <span className="w-6 h-6 rounded bg-purple-100 flex items-center justify-center text-purple-500 text-xs flex-shrink-0">B</span>
                                                    }
                                                    <span className="flex-1 truncate">{sel.name_ar ? `${sel.name_ar} — ${sel.name}` : sel.name}</span>
                                                </>
                                            ) : (
                                                <span className="flex-1 text-gray-400">{isRTL ? '-- اختر الماركة --' : '-- Select Brand --'}</span>
                                            );
                                        })()}
                                        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </button>

                                    {brandOpen && (
                                        <div className="absolute z-50 mt-1 w-full rounded-lg border shadow-lg bg-white dark:bg-gray-800 dark:border-gray-600" style={{ maxHeight: 260, overflowY: 'auto' }}>
                                            {/* Search */}
                                            <div className="p-2 border-b dark:border-gray-600">
                                                <input
                                                    autoFocus
                                                    className="input-field w-full text-sm py-1"
                                                    placeholder={isRTL ? 'بحث...' : 'Search...'}
                                                    value={brandSearch}
                                                    onChange={e => setBrandSearch(e.target.value)}
                                                    onClick={e => e.stopPropagation()}
                                                />
                                            </div>
                                            {/* Clear option */}
                                            <button
                                                type="button"
                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                                                onClick={() => { setForm((f: any) => ({ ...f, brandId: null, brand: '' })); setBrandOpen(false); }}
                                            >
                                                {isRTL ? '-- بدون ماركة --' : '-- No Brand --'}
                                            </button>
                                            {brands
                                                .filter(b => {
                                                    const q = brandSearch.toLowerCase();
                                                    return !q || b.name.toLowerCase().includes(q) || (b.name_ar ?? '').includes(brandSearch);
                                                })
                                                .map(b => (
                                                    <button
                                                        key={b.id}
                                                        type="button"
                                                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-purple-50 dark:hover:bg-purple-900/20 ${form.brandId === b.id ? 'bg-purple-50 dark:bg-purple-900/30 font-semibold' : ''}`}
                                                        onClick={() => {
                                                            setForm((f: any) => ({
                                                                ...f,
                                                                brandId: b.id,
                                                                brand: b.name,
                                                                countryOfOrigin: f.countryOfOrigin || b.country_of_origin || '',
                                                            }));
                                                            setBrandOpen(false);
                                                        }}
                                                    >
                                                        {b.image_url
                                                            ? <img src={b.image_url} alt={b.name} className="w-7 h-7 object-contain rounded flex-shrink-0" />
                                                            : <span className="w-7 h-7 rounded bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-500 text-xs font-bold flex-shrink-0">{b.name[0]?.toUpperCase()}</span>
                                                        }
                                                        <span className="flex-1 text-right truncate">
                                                            {b.name_ar ? `${b.name_ar} — ` : ''}{b.name}
                                                        </span>
                                                    </button>
                                                ))
                                            }
                                            {brands.filter(b => {
                                                const q = brandSearch.toLowerCase();
                                                return !q || b.name.toLowerCase().includes(q) || (b.name_ar ?? '').includes(brandSearch);
                                            }).length === 0 && (
                                                <p className="p-3 text-center text-sm text-gray-400">{isRTL ? 'لا توجد نتائج' : 'No results'}</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className={lblCls} style={{ color: 'var(--text-secondary)' }}>Quality Grade</label>
                                    <select className="select-field w-full" value={form.qualityGrade || ''} onChange={e => setForm((f:any) => ({ ...f, qualityGrade: e.target.value }))}>
                                        <option value="">{isRTL ? 'غير محدد' : 'Unspecified'}</option>
                                        <option value="original">{isRTL ? 'أصلي' : 'Original'}</option>
                                        <option value="oem">OEM</option>
                                        <option value="aftermarket">{isRTL ? 'بديل' : 'Aftermarket'}</option>
                                        <option value="used">{isRTL ? 'مستعمل' : 'Used'}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={lblCls} style={{ color: 'var(--text-secondary)' }}>Country of Origin</label>
                                    <input className="input-field w-full" value={form.countryOfOrigin || ''} onChange={e => setForm((f:any) => ({ ...f, countryOfOrigin: e.target.value }))} placeholder="e.g. Japan, Germany..." />
                                </div>
                                <div>
                                    <label className={lblCls} style={{ color: 'var(--text-secondary)' }}>
                                        {isRTL ? 'موقع الرف (Bin Location)' : 'Bin Location'}
                                    </label>
                                    <input className="input-field w-full" value={form.binLocation || ''} onChange={e => setForm((f:any) => ({ ...f, binLocation: e.target.value }))} placeholder="e.g. A-12-B" />
                                </div>
                                <div>
                                    <label className={lblCls} style={{ color: 'var(--text-secondary)' }}>
                                        {isRTL ? 'مدة الضمان (شهور)' : 'Warranty (Months)'}
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="120"
                                        className="input-field w-full"
                                        value={form.warrantyMonths || 0}
                                        onChange={e => setForm((f: any) => ({ ...f, warrantyMonths: parseInt(e.target.value) || 0 }))}
                                        placeholder="0 = بدون ضمان"
                                    />
                                    {form.warrantyMonths > 0 && (
                                        <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                                            {isRTL ? `الضمان يُنشأ تلقائياً عند البيع لمدة ${form.warrantyMonths} شهر` : `Warranty auto-created on sale for ${form.warrantyMonths} months`}
                                        </p>
                                    )}
                                </div>
                                <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-2">
                                    <div className="flex items-center gap-3 mt-6">
                                        <input 
                                            type="checkbox" 
                                            id="isKit"
                                            checked={form.isKit || false}
                                            onChange={e => setForm((f: any) => ({ ...f, isKit: e.target.checked }))}
                                            className="w-4 h-4 text-purple-600 rounded"
                                        />
                                        <label htmlFor="isKit" className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                                            {isRTL ? 'هل هذا طقم / تجميعة وهمية (Kit)؟' : 'Is this a Kit / Bundle?'}
                                        </label>
                                    </div>
                                    <div className="flex items-center gap-3 mt-6">
                                        <input 
                                            type="checkbox" 
                                            id="hasCoreCharge"
                                            checked={form.hasCoreCharge || false}
                                            onChange={e => setForm((f: any) => ({ ...f, hasCoreCharge: e.target.checked }))}
                                            className="w-4 h-4 text-blue-600 rounded"
                                        />
                                        <label htmlFor="hasCoreCharge" className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                                            {isRTL ? 'يتطلب إرجاع التالف (Core Charge)؟' : 'Requires Core Return?'}
                                        </label>
                                    </div>
                                    {form.hasCoreCharge && (
                                        <div>
                                            <label className={lblCls} style={{ color: 'var(--text-secondary)' }}>
                                                {isRTL ? 'قيمة التالف' : 'Core Charge Amount'}
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                className="input-field w-full"
                                                value={form.coreChargeAmount || 0}
                                                onChange={e => setForm((f: any) => ({ ...f, coreChargeAmount: parseFloat(e.target.value) || 0 }))}
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="col-span-1 md:col-span-2 pt-2 border-t" style={{ borderColor: 'var(--border-default)' }}>
                                    <label className={lblCls} style={{ color: 'var(--text-secondary)' }}>
                                        {isRTL ? 'تحديث رقم القطعة (رقم القطعة الجديد)' : 'Superseded By (New Part)'}
                                    </label>
                                    <select className="select-field w-full" value={form.supersededById || ''} onChange={e => setForm((f:any) => ({ ...f, supersededById: e.target.value }))}>
                                        <option value="">{isRTL ? 'لا يوجد استبدال' : 'Not Superseded'}</option>
                                        {products.filter(p => p.id !== editingProduct?.id).map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.partNumber} - {isRTL ? p.nameAr : p.name}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs mt-1 text-gray-500">
                                        {isRTL ? 'إذا كان هذا الرقم قديماً وتم تغييره من قبل المصنع، اختر الرقم الجديد هنا.' : 'If this part number was changed by the manufacturer, select the new part here.'}
                                    </p>
                                </div>
                            </div>
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
                        </>
                    ) : activeTab === 'compatibility' ? (
                        <ProductCompatibilityTab
                            productId={editingProduct?.id || ''}
                            isRTL={isRTL}
                            pendingVehicles={!editingProduct ? form.pendingVehicles : undefined}
                            onPendingChange={!editingProduct ? (v: any[]) => setForm((f: any) => ({ ...f, pendingVehicles: v })) : undefined}
                        />
                    ) : activeTab === 'components' ? (
                        <ProductComponentsTab productId={editingProduct!.id} isRTL={isRTL} />
                    ) : (
                        <ProductAlternativesTab productId={editingProduct!.id} isRTL={isRTL} />
                    )}
                </div>
                <div className="p-5 border-t flex justify-end gap-3" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface-secondary)' }}>
                    <button onClick={() => setShowAddEdit(false)} className="btn-secondary px-6">{common.cancel}</button>
                    {(activeTab === 'basic' || (activeTab === 'compatibility' && !editingProduct)) && (
                        <button onClick={saveProduct} disabled={(!form.name && !form.nameAr) || !!form._uploadingImage} className="btn-primary px-8 disabled:opacity-50">{common.save}</button>
                    )}
                </div>
            </div>
        </div>
        {showXrefModal && editingProduct && (
            <CrossReferenceManagerModal
                productId={editingProduct.id}
                productName={editingProduct.name || editingProduct.nameAr || ''}
                isRTL={isRTL}
                onClose={() => setShowXrefModal(false)}
            />
        )}
    </>
    );
});

export default InventoryFormModal;
