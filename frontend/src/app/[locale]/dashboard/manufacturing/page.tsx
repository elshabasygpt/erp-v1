"use client";

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { inventoryApi, productsApi } from '@/lib/api';

export default function ManufacturingPage() {
    const { isRTL } = useLanguage();
    const [products, setProducts] = useState<any[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [bom, setBom] = useState<any[]>([]);
    const [loadingBom, setLoadingBom] = useState(false);
    const [qty, setQty] = useState(1);
    const [assembling, setAssembling] = useState(false);
    const [history, setHistory] = useState<any[]>([]);
    const [tab, setTab] = useState<'bom' | 'produce'>('bom');

    // BOM editor
    const [bomComponents, setBomComponents] = useState<{ product_id: string; quantity: number }[]>([]);
    const [savingBom, setSavingBom] = useState(false);

    useEffect(() => {
        productsApi.getProducts({ limit: 200 }).then(r => {
            setProducts(r.data?.data || r.data || []);
        }).catch(() => {});
    }, []);

    const loadBom = async (productId: string) => {
        setLoadingBom(true);
        try {
            const res = await inventoryApi.getBOM(productId);
            const components = res.data?.data || res.data || [];
            setBom(components);
            setBomComponents(components.map((c: any) => ({ product_id: c.component_id || c.product_id, quantity: c.quantity })));
        } catch {
            setBom([]);
            setBomComponents([{ product_id: '', quantity: 1 }]);
        } finally { setLoadingBom(false); }
    };

    const handleSelectProduct = (product: any) => {
        setSelectedProduct(product);
        loadBom(product.id);
    };

    const handleSaveBom = async () => {
        if (!selectedProduct) return;
        setSavingBom(true);
        try {
            await inventoryApi.setBOM(selectedProduct.id, { components: bomComponents });
            await loadBom(selectedProduct.id);
            alert(isRTL ? 'تم حفظ وصفة الإنتاج بنجاح' : 'BOM saved successfully!');
        } catch (err: any) { alert(err?.response?.data?.message || 'Error saving BOM'); }
        finally { setSavingBom(false); }
    };

    const handleProduce = async () => {
        if (!selectedProduct) return;
        setAssembling(true);
        try {
            await inventoryApi.assemble({ product_id: selectedProduct.id, quantity: qty });
            setHistory(prev => [...prev, { product: selectedProduct.name, qty, date: new Date().toLocaleString() }]);
            alert(isRTL ? `تم تصنيع ${qty} وحدة من "${selectedProduct.name}" بنجاح!` : `Successfully produced ${qty} unit(s) of "${selectedProduct.name}"!`);
        } catch (err: any) { alert(err?.response?.data?.message || 'Error assembling'); }
        finally { setAssembling(false); }
    };

    const addBomRow = () => setBomComponents(c => [...c, { product_id: '', quantity: 1 }]);
    const removeBomRow = (i: number) => setBomComponents(c => c.filter((_, idx) => idx !== i));
    const updateBomRow = (i: number, field: string, val: any) => setBomComponents(c => {
        const arr = [...c]; arr[i] = { ...arr[i], [field]: val }; return arr;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-lime-500 to-green-600">
                    {isRTL ? 'التصنيع وتجميع المنتجات' : 'Manufacturing & Assembly'}
                </h1>
                <p className="text-slate-500 mt-1 text-sm">{isRTL ? 'تعريف وصفات الإنتاج (BOM) وتنفيذ أوامر التصنيع' : 'Define Bill of Materials and execute production orders'}</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {/* Product Selector */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                    <h3 className="font-semibold mb-3 text-sm">{isRTL ? 'اختر المنتج النهائي' : 'Select Finished Product'}</h3>
                    <input
                        type="text" placeholder={isRTL ? 'ابحث عن منتج...' : 'Search product...'}
                        className="w-full p-2 text-sm border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 mb-3"
                        onChange={() => {}}
                    />
                    <div className="space-y-1 max-h-96 overflow-y-auto">
                        {products.map(p => (
                            <button key={p.id} onClick={() => handleSelectProduct(p)}
                                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition ${selectedProduct?.id === p.id ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                                <div className="font-medium">{p.name}</div>
                                <div className="text-xs text-slate-400 mt-0.5">{isRTL ? 'المخزون:' : 'Stock:'} {p.quantity ?? 0}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* BOM & Production */}
                <div className="md:col-span-2 space-y-4">
                    {selectedProduct ? (
                        <>
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <div className="flex border-b border-slate-200 dark:border-slate-700">
                                    {[
                                        { key: 'bom', ar: 'وصفة الإنتاج (BOM)', en: 'Bill of Materials' },
                                        { key: 'produce', ar: 'تنفيذ أمر الإنتاج', en: 'Production Order' },
                                    ].map(t => (
                                        <button key={t.key} onClick={() => setTab(t.key as 'bom' | 'produce')}
                                            className={`px-5 py-3 text-sm font-medium border-b-2 transition ${tab === t.key ? 'border-green-500 text-green-600 bg-green-50 dark:bg-green-900/20' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                                            {isRTL ? t.ar : t.en}
                                        </button>
                                    ))}
                                </div>

                                <div className="p-5">
                                    {tab === 'bom' && (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-sm font-medium text-slate-500">{isRTL ? 'منتج:' : 'Product:'}</span>
                                                <span className="font-bold">{selectedProduct.name}</span>
                                            </div>
                                            
                                            <div className="space-y-2">
                                                {bomComponents.map((comp, i) => (
                                                    <div key={i} className="flex gap-2 items-center">
                                                        <select value={comp.product_id} onChange={e => updateBomRow(i, 'product_id', e.target.value)}
                                                            className="flex-1 p-2 text-sm border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                                                            <option value="">{isRTL ? '-- مادة خامة / مكون --' : '-- Raw material / Component --'}</option>
                                                            {products.filter(p => p.id !== selectedProduct.id).map(p => (
                                                                <option key={p.id} value={p.id}>{p.name} ({isRTL ? 'متوفر:' : 'Stock:'} {p.quantity ?? 0})</option>
                                                            ))}
                                                        </select>
                                                        <input type="number" min="0.001" step="0.001" value={comp.quantity}
                                                            onChange={e => updateBomRow(i, 'quantity', parseFloat(e.target.value))}
                                                            className="w-24 p-2 text-sm border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                                                            placeholder={isRTL ? 'الكمية' : 'Qty'}/>
                                                        <button onClick={() => removeBomRow(i)} className="text-red-400 hover:text-red-600 text-xl px-1">&times;</button>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="flex gap-2 pt-2">
                                                <button onClick={addBomRow} className="px-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600">
                                                    + {isRTL ? 'إضافة مكون' : 'Add Component'}
                                                </button>
                                                <button onClick={handleSaveBom} disabled={savingBom} className="px-4 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium">
                                                    {savingBom ? '...' : (isRTL ? '💾 حفظ الوصفة' : '💾 Save BOM')}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {tab === 'produce' && (
                                        <div className="space-y-5">
                                            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
                                                <h4 className="text-sm font-semibold mb-3">{isRTL ? 'المواد المطلوبة لوحدة واحدة:' : 'Materials Required per 1 unit:'}</h4>
                                                {bom.length === 0 ? (
                                                    <p className="text-xs text-slate-400">{isRTL ? 'لا توجد وصفة إنتاج محددة لهذا المنتج' : 'No BOM defined for this product yet'}</p>
                                                ) : (
                                                    <div className="space-y-1.5">
                                                        {bom.map((c: any, i: number) => (
                                                            <div key={i} className="flex justify-between text-sm">
                                                                <span className="text-slate-600 dark:text-slate-400">{c.component?.name || c.product?.name || 'Component'}</span>
                                                                <span className="font-medium">{c.quantity} × {qty} = <strong>{(c.quantity * qty).toFixed(3)}</strong></span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium mb-1.5">{isRTL ? 'الكمية المراد تصنيعها' : 'Quantity to Produce'}</label>
                                                <input type="number" min="1" step="1" value={qty} onChange={e => setQty(parseInt(e.target.value) || 1)}
                                                    className="w-full p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"/>
                                            </div>

                                            <button onClick={handleProduce} disabled={assembling || bom.length === 0}
                                                className="w-full py-3 bg-gradient-to-r from-lime-500 to-green-600 text-white rounded-xl font-semibold disabled:opacity-50 hover:opacity-90 transition">
                                                {assembling ? (isRTL ? 'جاري التصنيع...' : 'Producing...') : `⚙️ ${isRTL ? `تصنيع ${qty} وحدة` : `Produce ${qty} unit(s)`}`}
                                            </button>

                                            {history.length > 0 && (
                                                <div className="mt-4">
                                                    <h4 className="text-sm font-semibold mb-2">{isRTL ? 'سجل الإنتاج (هذه الجلسة)' : 'Production Log (this session)'}</h4>
                                                    <div className="space-y-1.5">
                                                        {history.slice(-5).reverse().map((h, i) => (
                                                            <div key={i} className="flex justify-between text-xs p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                                                <span>✅ {h.product}</span>
                                                                <span className="font-medium">{h.qty} {isRTL ? 'وحدة' : 'unit(s)'}</span>
                                                                <span className="text-slate-400">{h.date}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center text-slate-400">
                            <svg className="w-16 h-16 mx-auto mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/></svg>
                            <p className="text-sm">{isRTL ? 'اختر منتجاً من القائمة لتعريف وصفته أو تصنيعه' : 'Select a product from the list to define its BOM or produce it'}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
