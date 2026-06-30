'use client';

import { useState, useEffect } from 'react';
import { inventoryApi, settingsApi } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { Printer, Search, X, Package, Check, AlertTriangle } from 'lucide-react';
import { useRegionalSettings } from '@/providers/RegionalSettingsProvider';
import {
    ProductLabel, LabelPrintSheet, usePrintLabels,
    type LabelOptions, type LabelProduct, DEFAULT_LABEL_OPTIONS, LABEL_SIZE_OPTIONS, labelCode,
} from '@/components/inventory/labels/ProductLabel';

interface SearchProduct {
    id: string;
    name: string;
    name_ar?: string;
    sku: string | null;
    barcode: string | null;
    sell_price?: string | number;
}

const toLabelProduct = (p: SearchProduct): LabelProduct => ({
    name: p.name,
    nameAr: p.name_ar,
    sku: p.sku,
    barcode: p.barcode,
    price: (() => { const n = typeof p.sell_price === 'string' ? parseFloat(p.sell_price) : p.sell_price; return typeof n === 'number' && !Number.isNaN(n) ? n : undefined; })(),
});

export default function ProductLabelsPage() {
    const { currencySymbol } = useRegionalSettings();
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState<SearchProduct[]>([]);
    const [selected, setSelected] = useState<Map<string, { product: SearchProduct; qty: number }>>(new Map());
    const [searching, setSearching] = useState(false);

    const [options, setOptions] = useState<LabelOptions>(DEFAULT_LABEL_OPTIONS);
    const [companyName, setCompanyName] = useState('');
    const { print, queue } = usePrintLabels();

    // Seed defaults from the global barcode settings (shared with the print modal).
    useEffect(() => {
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
            } catch { /* ignore */ }
        }).catch(() => {});
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (search.trim().length >= 2) doSearch();
            else setSearchResults([]);
        }, 400);
        return () => clearTimeout(timer);
    }, [search]);

    const doSearch = async () => {
        setSearching(true);
        try {
            const res = await inventoryApi.searchProducts(search);
            const data = res.data?.data ?? res.data ?? [];
            setSearchResults(Array.isArray(data) ? data.slice(0, 20) : []);
        } catch {
            setSearchResults([]);
        } finally {
            setSearching(false);
        }
    };

    const addProduct = (product: SearchProduct) => {
        setSelected(prev => {
            const next = new Map(prev);
            if (next.has(product.id)) next.get(product.id)!.qty += 1;
            else next.set(product.id, { product, qty: 1 });
            return next;
        });
    };
    const removeProduct = (id: string) => setSelected(prev => { const next = new Map(prev); next.delete(id); return next; });
    const setQty = (id: string, qty: number) => {
        if (qty < 1) return;
        setSelected(prev => { const next = new Map(prev); if (next.has(id)) next.get(id)!.qty = qty; return next; });
    };

    const runPrint = (entries: { product: SearchProduct; qty: number }[]) => {
        const res = print(entries.map(e => ({ product: toLabelProduct(e.product), qty: e.qty })));
        if (!res.ok) { toast.error('لا يوجد باركود/SKU لأي منتج مختار — لا يمكن الطباعة'); return; }
        if (res.skipped > 0) toast(`تم تجاهل ${res.skipped} منتج بدون باركود/SKU`, { icon: '⚠️' });
    };
    const handlePrintBulk = () => {
        if (selected.size === 0) { toast.error('اختر منتجاً واحداً على الأقل'); return; }
        runPrint(Array.from(selected.values()));
    };

    // First selected product (or first search result) drives the live preview.
    const previewSrc = Array.from(selected.values())[0]?.product ?? searchResults[0];

    const Toggle = ({ k, label }: { k: keyof LabelOptions; label: string }) => (
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
            <input type="checkbox" checked={options[k] as boolean} onChange={e => setOptions(o => ({ ...o, [k]: e.target.checked }))} />
            {label}
        </label>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-4 justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">طباعة ملصقات المنتجات / Product Labels</h1>
                    <p className="text-gray-500 mt-1">ابحث عن المنتجات، تحكّم في شكل الملصق، واطبع باركود قابلاً للمسح (Code 128 / QR)</p>
                </div>
                {selected.size > 0 && (
                    <Button onClick={handlePrintBulk} className="flex items-center gap-2">
                        <Printer className="w-4 h-4" />
                        {`طباعة الكل (${selected.size} منتج)`}
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Controls + live preview */}
                <Card className="p-4 space-y-4 lg:col-span-1">
                    <h3 className="font-semibold text-gray-700 dark:text-gray-300">شكل الملصق</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">النوع</label>
                            <select value={options.type} onChange={e => setOptions(o => ({ ...o, type: e.target.value as LabelOptions['type'] }))}
                                className="border rounded px-2 py-1.5 text-sm w-full bg-white dark:bg-gray-800">
                                <option value="1D">1D (Code 128)</option>
                                <option value="QR">2D (QR)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">المقاس</label>
                            <select value={options.size} onChange={e => setOptions(o => ({ ...o, size: e.target.value as LabelOptions['size'] }))}
                                className="border rounded px-2 py-1.5 text-sm w-full bg-white dark:bg-gray-800">
                                {LABEL_SIZE_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                        <Toggle k="showName" label="اسم المنتج" />
                        <Toggle k="showBarcode" label="الباركود" />
                        <Toggle k="showValue" label="الرقم تحت الباركود" />
                        <Toggle k="showSku" label="رمز SKU" />
                        <Toggle k="showPrice" label="السعر" />
                        <Toggle k="showCompany" label="اسم الشركة" />
                    </div>

                    {/* Live preview */}
                    <div className="pt-2">
                        <p className="text-xs text-gray-500 mb-2">معاينة حيّة</p>
                        <div className="flex justify-center bg-gray-100 dark:bg-gray-900/40 rounded-lg p-4 min-h-[120px] items-center">
                            {previewSrc ? (
                                <ProductLabel product={toLabelProduct(previewSrc)} options={options}
                                    companyName={companyName} currency={currencySymbol} isRTL preview />
                            ) : (
                                <span className="text-xs text-gray-400">اختر منتجاً لعرض المعاينة</span>
                            )}
                        </div>
                    </div>
                </Card>

                {/* Search */}
                <Card className="p-4 space-y-4">
                    <h3 className="font-semibold text-gray-700 dark:text-gray-300">البحث عن منتجات</h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input className="border rounded pl-9 pr-3 py-2 w-full bg-white dark:bg-gray-800"
                            placeholder="ابحث بالاسم أو SKU أو الباركود..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    {searching && <p className="text-sm text-gray-400">جاري البحث...</p>}
                    <div className="space-y-1 max-h-80 overflow-y-auto">
                        {searchResults.map(product => {
                            const noCode = labelCode(toLabelProduct(product)) === '';
                            return (
                                <div key={product.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg cursor-pointer"
                                    onClick={() => addProduct(product)}>
                                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded flex items-center justify-center flex-shrink-0">
                                        <Package className="w-4 h-4 text-blue-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{product.name}</p>
                                        <p className="text-xs text-gray-500">{product.sku ?? ''} {product.barcode ? `| ${product.barcode}` : ''}</p>
                                    </div>
                                    {noCode && <span title="لا يوجد باركود أو SKU"><AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" /></span>}
                                    {selected.has(product.id) && <Check className="w-4 h-4 text-green-500 flex-shrink-0" />}
                                </div>
                            );
                        })}
                        {searchResults.length === 0 && search.length >= 2 && !searching && (
                            <p className="text-sm text-gray-500 text-center py-4">لا توجد نتائج</p>
                        )}
                    </div>
                </Card>

                {/* Selected */}
                <Card className="p-4 space-y-4">
                    <h3 className="font-semibold text-gray-700 dark:text-gray-300">المنتجات المختارة ({selected.size})</h3>
                    {selected.size === 0 ? (
                        <div className="py-8 text-center text-gray-400">
                            <Printer className="w-10 h-10 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">ابحث عن منتجات وانقر عليها لإضافتها</p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {Array.from(selected.values()).map(({ product, qty }) => {
                                const noCode = labelCode(toLabelProduct(product)) === '';
                                return (
                                    <div key={product.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{product.name}</p>
                                            <p className="text-xs text-gray-500 flex items-center gap-1">
                                                {noCode
                                                    ? <span className="text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> بدون باركود/SKU</span>
                                                    : (product.barcode ?? product.sku)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <label className="text-xs text-gray-500">نسخ:</label>
                                            <input type="number" min="1" max="100"
                                                className="w-16 border rounded px-2 py-1 text-sm bg-white dark:bg-gray-700"
                                                value={qty} onChange={e => setQty(product.id, parseInt(e.target.value) || 1)} />
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={() => runPrint([{ product, qty }])}
                                            disabled={noCode} title={noCode ? 'لا يوجد باركود' : 'طباعة هذا المنتج فقط'}
                                            className="text-blue-500 hover:text-blue-700 px-2 disabled:opacity-40">
                                            <Printer className="w-4 h-4" />
                                        </Button>
                                        <button onClick={() => removeProduct(product.id)} className="text-red-400 hover:text-red-600">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {selected.size > 0 && (
                        <Button onClick={handlePrintBulk} className="w-full flex items-center justify-center gap-2">
                            <Printer className="w-4 h-4" /> طباعة الكل
                        </Button>
                    )}
                </Card>
            </div>

            <LabelPrintSheet queue={queue} options={options} companyName={companyName} currency={currencySymbol} isRTL />
        </div>
    );
}
