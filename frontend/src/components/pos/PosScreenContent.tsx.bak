'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import InvoicePrintTemplate from '@/components/sales/InvoicePrintTemplate';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { inventoryApi, crmApi, settingsApi } from '@/lib/api';

const FALLBACK_CATEGORIES = [
    { key: 'all', ar: 'الكل', en: 'All' },
];

const FALLBACK_PRODUCTS: any[] = [];

// ── Interfaces ──
interface CartItem {
    product: any;
    qty: number;
    discount: number; // percentage
}

interface PosSession {
    id: string; // unique ID like Tab-1
    title: string;
    cart: CartItem[];
    customerName: string;
    customerVat: string;
    invoiceType: 'simplified' | 'tax_invoice';
    paymentType: 'cash' | 'card' | 'split' | 'credit';
    cashPaid: string;
    cardPaid: string;
    invoiceDiscount: number; // fixed amount
    isHeld?: boolean;
    heldNote?: string;
}

export default function PosScreenContent({ dict, locale }: { dict: any; locale: string }) {
    const isRTL = locale === 'ar';
    const { isOnline, pendingCount, isSyncing, handleSaveInvoice, syncPendingInvoices } = useOfflineSync();

    // ── Global App State ──
    const [products, setProducts] = useState<any[]>(FALLBACK_PRODUCTS);
    const [categories, setCategories] = useState<any[]>(FALLBACK_CATEGORIES);
    const [category, setCategory] = useState('all');
    const [search, setSearch] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    // UI Modals
    const [allCustomers, setAllCustomers] = useState<any[]>([]);
    const [customerSearch, setCustomerSearch] = useState('');
    const [showCustomerResults, setShowCustomerResults] = useState(false);
    
    const [showPayment, setShowPayment] = useState(false);
    const [showPrint, setShowPrint] = useState(false);
    const [showHoldModal, setShowHoldModal] = useState(false);
    const [holdNote, setHoldNote] = useState('');
    const [showRecallList, setShowRecallList] = useState(false);
    
    const [lastInvoiceNum, setLastInvoiceNum] = useState(1);
    const [successMsg, setSuccessMsg] = useState('');
    const [printInvoiceData, setPrintInvoiceData] = useState<any>(null);
    const [sellerInfo, setSellerInfo] = useState<any>(null);  // loaded from settingsApi
    const [showQuickAddCustomer, setShowQuickAddCustomer] = useState(false);
    const [quickAddName, setQuickAddName] = useState('');
    const [quickAddPhone, setQuickAddPhone] = useState('');

    // ── Session Management (Multi-Tabs) ──
    const createEmptySession = (idx: number): PosSession => ({
        id: `tab-${Date.now()}-${idx}`,
        title: `${isRTL ? 'فاتورة' : 'Invoice'} ${idx}`,
        cart: [],
        customerName: '',
        customerVat: '',
        invoiceType: 'simplified',
        paymentType: 'cash',
        cashPaid: '',
        cardPaid: '',
        invoiceDiscount: 0,
    });

    const [sessions, setSessions] = useState<PosSession[]>([createEmptySession(1)]);
    const [activeIdx, setActiveIdx] = useState(0);
    const activeSession = sessions[activeIdx];

    // Load/Save Sessions to localStorage
    useEffect(() => {
        const saved = localStorage.getItem('pos_sessions');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.length > 0) {
                    setSessions(parsed);
                }
            } catch (e) { console.error('Failed to parse sessions'); }
        }
        // Load initial products and customers from API
        loadData();
    }, []);

    useEffect(() => {
        if (sessions.length > 0) {
            localStorage.setItem('pos_sessions', JSON.stringify(sessions));
        }
    }, [sessions]);

    const loadData = async () => {
        try {
            const [prodRes, custRes] = await Promise.all([
                inventoryApi.getProducts({ limit: 1000 }),
                crmApi.getCustomers({ limit: 1000 })
            ]);

            const fetchedProducts = prodRes.data?.data?.data || prodRes.data?.data;
            if (fetchedProducts && Array.isArray(fetchedProducts)) {
                setProducts(fetchedProducts);
                const cats = Array.from(new Set(fetchedProducts.map((p: any) => p.category).filter(Boolean)));
                const newCats = [{ key: 'all', ar: 'الكل', en: 'All' }];
                cats.forEach((c: any) => newCats.push({ key: c, ar: c, en: c }));
                setCategories(newCats);
            }

            const fetchedCustomers = custRes.data?.data?.data || custRes.data?.data;
            if (fetchedCustomers && Array.isArray(fetchedCustomers)) {
                setAllCustomers(fetchedCustomers);
            }

            // Load seller info from settings
            try {
                const settingsRes = await settingsApi.getSettings();
                const s = settingsRes.data?.data || settingsRes.data;
                if (s) {
                    setSellerInfo({
                        name: s.company_name || s.store_name || (isRTL ? 'اسم الشركة' : 'My Company'),
                        vatNumber: s.vat_number || s.tax_number || '',
                        crNumber: s.commercial_register || s.cr_number || '',
                        address: s.address || '',
                        city: s.city || '',
                        phone: s.phone || s.mobile || '',
                    });
                }
            } catch (e) {
                console.warn('Settings not loaded, using defaults');
            }
        } catch (e) {
            console.error('Failed to fetch data');
        }
    };

    // ── Session Operations ──
    const updateActiveSession = (updates: Partial<PosSession>) => {
        const newSessions = [...sessions];
        newSessions[activeIdx] = { ...newSessions[activeIdx], ...updates };
        setSessions(newSessions);
    };

    const handleNewTab = () => {
        if (sessions.length >= 8) return alert(isRTL ? 'الحد الأقصى للتبويبات هو 8' : 'Maximum 8 tabs allowed');
        const newS = createEmptySession(sessions.length + 1);
        setSessions([...sessions, newS]);
        setActiveIdx(sessions.length);
    };

    const handleCloseTab = (idx: number, e: any) => {
        e.stopPropagation();
        if (sessions.length === 1) {
            setSessions([createEmptySession(1)]);
            setActiveIdx(0);
            return;
        }
        if (sessions[idx].cart.length > 0) {
            if (!confirm(isRTL ? 'الفاتورة تحتوي على أصناف، هل أنت متأكد من الإغلاق؟' : 'Cart is not empty, close anyway?')) return;
        }
        const newTabs = sessions.filter((_, i) => i !== idx);
        setSessions(newTabs);
        if (activeIdx >= newTabs.length) setActiveIdx(newTabs.length - 1);
        else if (activeIdx > idx) setActiveIdx(activeIdx - 1);
    };

    // ── Filtered Products ──
    const filteredProducts = useMemo(() => {
        return products.filter((p) => {
            const matchCat = category === 'all' || p.category === category;
            const q = search.toLowerCase();
            const matchSearch = !q || p.name?.toLowerCase().includes(q) || p.nameAr?.includes(q) || p.code?.toLowerCase().includes(q) || p.barcode?.includes(q);
            return matchCat && matchSearch;
        });
    }, [category, search, products]);

    // ── Cart Calculations Math ──
    const cartSubtotalExcl = activeSession?.cart.reduce((sum, item) => {
        const linePrice = item.qty * item.product.price;
        const disc = linePrice * (item.discount / 100);
        return sum + (linePrice - disc);
    }, 0) || 0;
    
    // Apply invoice level discount
    const discountedExcl = Math.max(0, cartSubtotalExcl - (activeSession?.invoiceDiscount || 0));
    const cartVat = discountedExcl * 0.15; // VAT based on Saudi 15%
    const cartTotal = discountedExcl + cartVat;

    // For payment calculation
    const totalPaidCNum = parseFloat(activeSession?.cashPaid || '0') || 0;
    const totalPaidCardNum = parseFloat(activeSession?.cardPaid || '0') || 0;
    const change = Math.max(0, (totalPaidCNum + totalPaidCardNum) - cartTotal);

    // ── Actions ──
    const addToCart = useCallback((product: any) => {
        if (!product || (product.stock_quantity !== undefined && product.stock_quantity <= 0)) {
            // Sound effect for error
            if (typeof Audio !== 'undefined') new Audio('/error.mp3').play().catch(()=>{});
            return;
        }
        const newCart = [...activeSession.cart];
        const existing = newCart.find((i) => i.product.id === product.id);
        if (existing) {
            existing.qty += 1;
            if (product.stock_quantity && existing.qty > product.stock_quantity) existing.qty = product.stock_quantity;
        } else {
            newCart.push({ product, qty: 1, discount: 0 });
        }
        updateActiveSession({ cart: newCart });
        // Beep sound
        if (typeof Audio !== 'undefined') new Audio('/beep.mp3').play().catch(()=>{});
    }, [activeSession]);

    const updateQty = (id: number, qty: number) => {
        if (qty <= 0) { removeFromCart(id); return; }
        const newCart = activeSession.cart.map((i) => i.product.id === id ? { ...i, qty: (i.product.stock_quantity ? Math.min(qty, i.product.stock_quantity) : qty) } : i);
        updateActiveSession({ cart: newCart });
    };

    const removeFromCart = (id: number) => {
        updateActiveSession({ cart: activeSession.cart.filter((i) => i.product.id !== id) });
    };

    const clearCart = () => {
        updateActiveSession({ cart: [], customerName: '', customerVat: '', cashPaid: '', cardPaid: '', invoiceDiscount: 0 });
    };

    // ── Barcode Hook Integration ──
    useBarcodeScanner((barcode) => {
        // Try locally first
        const localProd = products.find(p => p.barcode === barcode || p.code === barcode);
        if (localProd) {
            addToCart(localProd);
            setSearch('');
            return;
        }
        // If not found, call API
        inventoryApi.scanBarcode(barcode).then(res => {
            if (res.data?.data) {
                // Add to our products array so we don't query it again
                setProducts(prev => [...prev, res.data.data]);
                addToCart(res.data.data);
                setSearch('');
            }
        }).catch(() => {
            alert(isRTL ? `منتج برمز ${barcode} غير موجود` : `Product with barcode ${barcode} not found`);
        });
    }, true);

    // ── Keyboard Shortcuts ──
    const shortcutMap: any = {
        'F1': () => handleNewTab(),
        'F2': () => searchInputRef.current?.focus(),
        'F3': () => document.getElementById('customer-search-input')?.focus(),
        'F4': () => document.getElementById('invoice-discount-input')?.focus(),
        'F8': () => { if (activeSession.cart.length > 0) setShowPayment(true); },
        'F9': () => toggleFullscreen(),
        'F10': () => { if (activeSession.cart.length > 0) setShowHoldModal(true); },
        'Delete': () => clearCart(),
        'Escape': () => {
            setShowPayment(false);
            setShowPrint(false);
            setShowHoldModal(false);
            setShowRecallList(false);
        },
    };

    // Alt+1 to Alt+8 for tabs
    for (let i = 1; i <= 8; i++) {
        shortcutMap[`Alt+${i}`] = () => { if (sessions[i - 1]) setActiveIdx(i - 1); };
    }

    useKeyboardShortcuts(shortcutMap, true);

    // ── Hold & Recall ──
    const holdCurrentInvoice = () => {
        if (activeSession.cart.length === 0) return;
        updateActiveSession({ isHeld: true, heldNote: holdNote || new Date().toLocaleTimeString() });
        setHoldNote('');
        setShowHoldModal(false);
        
        let msg = isRTL ? 'معلقة' : 'Held';
        setSuccessMsg(`✅ ${msg}`);
        setTimeout(() => setSuccessMsg(''), 3000);
        
        // Remove currently held from active array, push it back as a 'saved/held' only state if needed.
        // Actually, let's just create a new tab for the user to work on.
        handleNewTab();
    };

    // ── Checkout & Print ──
    const generatePayload = () => {
        const uuid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `offline-${Date.now()}`;
        return {
            id: `INV-2024-${String(lastInvoiceNum).padStart(4, '0')}`,
            uuid,
            type: activeSession.invoiceType as any,
            date: new Date().toISOString().slice(0, 10),
            time: new Date().toTimeString().slice(0, 8),
            seller: sellerInfo || { 
                name: isRTL ? 'شركتي التجارية' : 'My Trading Company', 
                vatNumber: '300000000000003', crNumber: '1010000000', 
                address: '1234 شارع الملك فهد، حي العليا', city: isRTL ? 'الرياض' : 'Riyadh', phone: '+966 11 000 0000' 
            },
            buyer: activeSession.customerName ? { name: activeSession.customerName, vatNumber: activeSession.customerVat || undefined } : undefined,
            items: activeSession.cart.map((i) => ({
                code: i.product.code,
                name: isRTL ? i.product.nameAr : i.product.name,
                qty: i.qty,
                unit: i.product.unit || 'PC',
                price: i.product.price * (1 - i.discount / 100),
                vatRate: 0.15,
            })),
            discount: activeSession.invoiceDiscount,
            paymentType: activeSession.paymentType === 'card' ? 'visa' : activeSession.paymentType as any,
            total: cartTotal,
            change: change,
        };
    };

    const handleCompletePurchase = async (print: boolean) => {
        if ((activeSession.paymentType === 'cash' || activeSession.paymentType === 'split') && (totalPaidCNum + totalPaidCardNum) < cartTotal) {
            alert(isRTL ? 'المبلغ المدفوع أقل من الإجمالي!' : 'Paid amount is less than total!');
            return;
        }

        const payload = generatePayload();
        const res = await handleSaveInvoice(payload.uuid, payload);
        
        setShowPayment(false);
        
        if (print) {
            setPrintInvoiceData(payload);
            setShowPrint(true);
        } else {
            setSuccessMsg(res.offline 
                ? (isRTL ? '✅ تم الحفظ محلياً (سيتم المزامنة لاحقاً)' : '✅ Saved locally (will sync later)') 
                : (isRTL ? '✅ تم حفظ الفاتورة بنجاح' : '✅ Invoice saved successfully')
            );
            setTimeout(() => setSuccessMsg(''), 4000);
        }
        
        setLastInvoiceNum((n) => n + 1);
        
        // Remove completed tab
        const newSessions = sessions.filter((_, i) => i !== activeIdx);
        if (newSessions.length === 0) setSessions([createEmptySession(1)]);
        else setSessions(newSessions);
        setActiveIdx(0);
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((err) => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
    };


    if (!activeSession) return null; // Safety

    return (
        <div className={`flex flex-col md:flex-row h-screen -m-8 overflow-hidden bg-surface-100 dark:bg-surface-950 animate-fade-in ${isFullscreen ? 'z-50 fixed inset-0 m-0' : 'h-[calc(100vh-4rem)]'}`}>
            
            {/* ─────────── LEFT: Grid & Tabs ─────────── */}
            <div className="flex flex-col flex-1 overflow-hidden h-full border-e border-default/50 relative">
                
                {/* ── Tabs Bar ── */}
                <div className="flex items-center bg-surface-50 dark:bg-surface-900 border-b overflow-x-auto no-scrollbar shadow-sm">
                    {sessions.map((sess, idx) => (
                        <div 
                            key={sess.id}
                            onClick={() => setActiveIdx(idx)}
                            className={`flex items-center gap-2 px-4 py-3 min-w-[150px] max-w-[200px] border-e cursor-pointer transition-all relative ${activeIdx === idx ? 'bg-white dark:bg-surface-800 border-t-2 border-t-primary-500 font-bold' : 'hover:bg-surface-200 dark:hover:bg-surface-800 text-surface-500'}`}
                        >
                            <span className="absolute top-1 start-1 text-[8px] opacity-30 font-mono">Alt+{idx+1}</span>
                            <span className="truncate text-xs flex-1 mt-1">
                                {sess.isHeld ? '⏸' : '📄'} {sess.title} 
                                {sess.cart.length > 0 && <span className="ms-2 rounded-full px-2 py-0.5 bg-primary-100 text-primary-700 text-[10px]">{sess.cart.reduce((a,c)=>a+c.qty,0)}</span>}
                            </span>
                            <button onClick={(e) => handleCloseTab(idx, e)} className="text-surface-400 hover:text-red-500 rounded-full hover:bg-red-50 p-1">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    ))}
                    <button onClick={handleNewTab} title="F1 (New Tab)" className="px-4 py-3 text-surface-500 hover:text-primary-500 hover:bg-primary-50 transition-colors font-bold flex items-center gap-1">
                        <span>+</span> <kbd className="hidden md:inline text-[10px] bg-surface-200 rounded px-1 ms-1">F1</kbd>
                    </button>
                    
                    <div className="ms-auto pe-4 flex items-center gap-2">
                        {isOnline ? (
                            pendingCount > 0 ? (
                                <button onClick={syncPendingInvoices} disabled={isSyncing} className="text-xs bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-full font-bold flex items-center gap-1 hover:bg-yellow-200 transition-colors">
                                    {isSyncing ? '⏳...' : `⚠️ ${isRTL ? 'مزامنة' : 'Sync'} (${pendingCount})`}
                                </button>
                            ) : (
                                <span className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" title="Online"></span>
                            )
                        ) : (
                            <span className="w-3 h-3 rounded-full bg-red-500" title="Offline"></span>
                        )}
                        <button onClick={toggleFullscreen} className="p-2 bg-surface-200 rounded-lg hover:bg-surface-300 transition" title={isRTL ? 'شاشة كاملة' : 'Fullscreen'}>
                            🔲
                        </button>
                    </div>
                </div>

                {/* ── Search Bar ── */}
                <div className="p-4 bg-white dark:bg-surface-950 border-b shadow-sm relative z-10 flex gap-2">
                    <div className="relative flex-1 group">
                        <svg className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400 group-focus-within:text-primary-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder={isRTL ? 'ابحث المنتج أو اسكن الباركود (F2)...' : 'Search or scan barcode (F2)...'}
                            className="input-field w-full ps-11 py-3 text-sm shadow-inner bg-surface-50 dark:bg-surface-900 focus:bg-white pos-search-input"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoFocus
                        />
                    </div>
                    {/* Quick Hold/Recall buttons beside Search */}
                    <button onClick={() => setShowRecallList(true)} title="F6 Recall" className="px-4 bg-orange-100 text-orange-700 font-bold rounded-xl text-sm flex items-center hover:bg-orange-200 transition">
                        📃 <span className="hidden md:inline ms-2">{isRTL ? 'استدعاء (F6)' : 'Recall (F6)'}</span>
                    </button>
                </div>

                {/* ── Categories ── */}
                <div className="flex gap-2 px-4 py-2 bg-surface-50 dark:bg-surface-900 border-b overflow-x-auto no-scrollbar shadow-inner">
                    {categories.map((c) => (
                        <button
                            key={c.key}
                            onClick={() => setCategory(c.key)}
                            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                                category === c.key ? 'bg-primary-600 text-white shadow-md' : 'bg-white dark:bg-surface-800 text-surface-600 border hover:bg-surface-100'
                            }`}
                        >
                            {isRTL ? c.ar : c.en}
                        </button>
                    ))}
                </div>

                {/* ── Product Grid ── */}
                <div className="flex-1 overflow-y-auto p-4 bg-surface-100 dark:bg-surface-950">
                    {successMsg && (
                        <div className="mb-4 p-3 bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg text-sm font-bold text-center animate-slide-up shadow-sm">
                            {successMsg}
                        </div>
                    )}
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {filteredProducts.map((product) => {
                            const inCart = activeSession.cart.find((i) => i.product.id === product.id);
                            const outOfStock = product.stock_quantity !== undefined && product.stock_quantity <= 0;
                            
                            return (
                                <button
                                    key={product.id}
                                    onClick={() => addToCart(product)}
                                    disabled={outOfStock}
                                    className={`relative flex flex-col items-start p-3 bg-white dark:bg-surface-900 rounded-2xl border text-start transition-all hover:shadow-lg active:scale-95 group ${
                                        outOfStock ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer'
                                    } ${inCart ? 'border-primary-500 shadow-md ring-1 ring-primary-500' : 'border-surface-200 dark:border-surface-800'}`}
                                >
                                    {/* Product Image */}
                                    <div className="w-full aspect-video rounded-xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-3xl mb-2 overflow-hidden relative">
                                        {product.image_url ? (
                                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                        ) : (
                                            product.category === 'phones' ? '📱' : product.category === 'electronics' ? '📺' : '📦'
                                        )}
                                        {outOfStock && <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center"><span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded font-bold">{isRTL ? 'نفذت الكمية' : 'Out of Stock'}</span></div>}
                                    </div>
                                    
                                    <h3 className="text-xs font-bold leading-tight mb-1 line-clamp-2 text-surface-800 dark:text-surface-200">
                                        {isRTL ? (product.nameAr || product.name) : product.name}
                                    </h3>
                                    <p className="text-[10px] font-mono text-surface-400 dark:text-surface-500 mb-2">{product.barcode || product.code}</p>
                                    
                                    <div className="w-full mt-auto flex items-center justify-between border-t border-dashed pt-2">
                                        <span className="text-sm font-black text-primary-600 dark:text-primary-400">{parseFloat(product.price).toLocaleString()} <span className="text-[9px]">ر.س</span></span>
                                        {product.stock_quantity !== undefined && (
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${product.stock_quantity <= 5 ? 'bg-red-50 text-red-600' : 'bg-surface-100 text-surface-600'}`}>
                                                {product.stock_quantity}
                                            </span>
                                        )}
                                    </div>

                                    {inCart && (
                                        <div className="absolute -top-2 -end-2 w-6 h-6 rounded-full bg-gradient-to-tr from-primary-600 to-indigo-500 text-white text-xs font-bold flex items-center justify-center shadow-lg border-2 border-white animate-scale-in z-10">
                                            {inCart.qty}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

            </div>

            {/* ─────────── RIGHT: Active Cart ─────────── */}
            <div className="w-full md:w-[380px] xl:w-[420px] shrink-0 flex flex-col h-full bg-white dark:bg-surface-900 shadow-xl z-20">
                {/* Cart Customer details config */}
                <div className="p-4 border-b bg-surface-50 dark:bg-surface-900 shadow-inner space-y-3">
                    <div className="flex bg-surface-200 p-1 rounded-lg">
                        <button onClick={() => updateActiveSession({ invoiceType: 'simplified' })} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeSession.invoiceType === 'simplified' ? 'bg-white shadow text-primary-600' : 'text-surface-500'}`}>
                            {isRTL ? 'مبسطة (B2C)' : 'Simplified'}
                        </button>
                        <button onClick={() => updateActiveSession({ invoiceType: 'tax_invoice' })} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeSession.invoiceType === 'tax_invoice' ? 'bg-white shadow text-primary-600' : 'text-surface-500'}`}>
                            {isRTL ? 'ضريبية (B2B)' : 'Tax Invoice'}
                        </button>
                    </div>

                    <div className="relative">
                        <input
                            id="customer-search-input"
                            type="text"
                            placeholder={isRTL ? 'ابحث العميل / رقم الجوال (F3)' : 'Customer Name / Phone (F3)'}
                            className="input-field w-full text-xs py-2 shadow-sm"
                            value={activeSession.customerName}
                            onChange={(e) => {
                                updateActiveSession({ customerName: e.target.value });
                                setShowCustomerResults(true);
                            }}
                            onFocus={() => setShowCustomerResults(true)}
                        />
                        
                        {/* Customer Search Dropdown */}
                        {showCustomerResults && activeSession.customerName && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-surface-800 border rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto animate-scale-in">
                                {allCustomers.filter(c => 
                                    c.name?.toLowerCase().includes(activeSession.customerName.toLowerCase()) || 
                                    c.phone?.includes(activeSession.customerName)
                                ).map(cust => (
                                    <div 
                                        key={cust.id}
                                        onClick={() => {
                                            updateActiveSession({ 
                                                customerName: cust.name, 
                                                customerVat: cust.vat_number || '',
                                                invoiceType: cust.vat_number ? 'tax_invoice' : 'simplified'
                                            });
                                            setShowCustomerResults(false);
                                        }}
                                        className="p-3 border-b last:border-0 hover:bg-primary-50 dark:hover:bg-primary-900/20 cursor-pointer flex justify-between items-center"
                                    >
                                        <div>
                                            <p className="text-xs font-bold text-surface-800 dark:text-surface-200">{cust.name}</p>
                                            <p className="text-[10px] text-surface-400">{cust.phone}</p>
                                        </div>
                                        {cust.vat_number && <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">VAT</span>}
                                    </div>
                                ))}
                                <div 
                                    onClick={() => { setShowCustomerResults(false); setShowQuickAddCustomer(true); }}
                                    className="p-2 text-center text-[10px] text-primary-500 font-bold hover:bg-primary-50 dark:hover:bg-primary-900/20 cursor-pointer flex items-center justify-center gap-1"
                                >
                                    <span>+</span> {isRTL ? 'إضافة عميل جديد (سريع)' : 'Add New Customer (Quick)'}
                                </div>
                            </div>
                        )}

                        {/* Quick Add Customer Form */}
                        {showQuickAddCustomer && (
                            <div className="absolute start-0 end-0 top-full mt-1 bg-white dark:bg-surface-900 border rounded-xl shadow-xl z-50 p-3 space-y-2" style={{ borderColor: 'var(--border-default)' }}>
                                <p className="text-[10px] font-bold text-surface-500 uppercase tracking-wider">{isRTL ? 'إضافة عميل جديد' : 'Quick Add Customer'}</p>
                                <input
                                    type="text"
                                    placeholder={isRTL ? 'اسم العميل *' : 'Customer Name *'}
                                    className="input-field w-full text-xs py-2"
                                    value={quickAddName}
                                    onChange={e => setQuickAddName(e.target.value)}
                                    autoFocus
                                />
                                <input
                                    type="text"
                                    placeholder={isRTL ? 'رقم الجوال' : 'Phone (optional)'}
                                    className="input-field w-full text-xs py-2"
                                    value={quickAddPhone}
                                    onChange={e => setQuickAddPhone(e.target.value)}
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={async () => {
                                            if (!quickAddName.trim()) return;
                                            try {
                                                const res = await crmApi.createCustomer({ name: quickAddName, name_ar: quickAddName, phone: quickAddPhone, group: 'retail', payment_type: 'cash' });
                                                const newCust = res.data?.data || res.data;
                                                updateActiveSession({ customerName: quickAddName });
                                                setAllCustomers(prev => [...prev, newCust]);
                                            } catch {
                                                updateActiveSession({ customerName: quickAddName });
                                            }
                                            setShowQuickAddCustomer(false);
                                            setQuickAddName('');
                                            setQuickAddPhone('');
                                        }}
                                        className="flex-1 btn-primary text-xs py-1.5"
                                    >
                                        {isRTL ? 'حفظ واختيار' : 'Save & Select'}
                                    </button>
                                    <button onClick={() => { setShowQuickAddCustomer(false); setQuickAddName(''); setQuickAddPhone(''); }} className="btn-secondary text-xs py-1.5">{isRTL ? 'إلغاء' : 'Cancel'}</button>
                                </div>
                            </div>
                        )}

                        {activeSession.invoiceType === 'tax_invoice' && (
                            <input
                                type="text"
                                placeholder={isRTL ? 'الرقم الضريبي العميل *' : 'VAT Number *'}
                                className="input-field w-full text-xs py-2 shadow-sm mt-2 font-mono"
                                value={activeSession.customerVat}
                                onChange={(e) => updateActiveSession({ customerVat: e.target.value })}
                            />
                        )}
                    </div>
                </div>

                {/* Clear Cart Button */}
                {activeSession.cart.length > 0 && (
                    <div className="px-4 pb-2">
                        <button 
                            onClick={clearCart}
                            className="w-full text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-900/10 py-1 rounded-lg border border-red-200 dark:border-red-900/30 hover:bg-red-500 hover:text-white transition-all uppercase tracking-wider"
                        >
                            🗑️ {isRTL ? 'مسح السلة (Delete)' : 'Clear Cart (Delete)'}
                        </button>
                    </div>
                )}

                {/* Items List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-surface-50 dark:bg-surface-950">
                    {activeSession.cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-50">
                            <span className="text-6xl mb-4 opacity-50 grayscale">🛒</span>
                            <p className="font-bold">{isRTL ? 'السلة فارغة' : 'Cart is empty'}</p>
                            <kbd className="mt-2 text-xs bg-surface-200 px-2 py-1 rounded">F2 to search</kbd>
                        </div>
                    ) : (
                        activeSession.cart.map((item) => {
                            const lineExcl = item.qty * item.product.price * (1 - item.discount / 100);
                            const lineVat = lineExcl * 0.15;
                            const lineTotal = lineExcl + lineVat;
                            return (
                                <div key={item.product.id} className="bg-white dark:bg-surface-900 border rounded-xl p-3 shadow-sm flex flex-col gap-2 relative group">
                                    <div className="flex justify-between items-start">
                                        <div className="pe-6">
                                            <p className="text-xs font-bold line-clamp-1">{isRTL ? (item.product.nameAr || item.product.name) : item.product.name}</p>
                                            <p className="text-[10px] text-primary-600 font-bold mt-0.5">{parseFloat(item.product.price).toLocaleString()} ر.س</p>
                                        </div>
                                        <div className="text-end">
                                            <p className="text-sm font-black text-indigo-700 dark:text-indigo-400">{lineTotal.toFixed(2)}</p>
                                        </div>
                                        
                                        <button onClick={() => removeFromCart(item.product.id)} className="absolute top-2 end-2 w-6 h-6 bg-red-50 text-red-500 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                    
                                    <div className="flex justify-between items-center bg-surface-50 dark:bg-surface-800 p-1 rounded-lg border mt-1">
                                        <div className="flex items-center gap-1.5">
                                            <button onClick={() => updateQty(item.product.id, item.qty - 1)} className="w-6 h-6 flex items-center justify-center bg-white dark:bg-surface-700 shadow-sm rounded text-surface-600 font-bold hover:bg-surface-200 transition">-</button>
                                            <span className="text-xs font-bold w-4 text-center">{item.qty}</span>
                                            <button onClick={() => updateQty(item.product.id, item.qty + 1)} className="w-6 h-6 flex items-center justify-center bg-white dark:bg-surface-700 shadow-sm rounded text-surface-600 font-bold hover:bg-surface-200 transition">+</button>
                                            
                                            {/* Quick Adders */}
                                            <div className="flex items-center gap-1 ms-1 ps-1 border-s border-default/50">
                                                <button onClick={() => updateQty(item.product.id, item.qty + 5)} className="text-[9px] font-bold bg-primary-50 text-primary-600 px-1 rounded hover:bg-primary-100">+5</button>
                                                <button onClick={() => updateQty(item.product.id, item.qty + 10)} className="text-[9px] font-bold bg-primary-50 text-primary-600 px-1 rounded hover:bg-primary-100">+10</button>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-1">
                                            <span className="text-[9px] text-surface-400">خصم %</span>
                                            <input 
                                                type="number" 
                                                min="0" max="100" 
                                                value={item.discount || ''} 
                                                onChange={(e) => {
                                                    const newCart = [...activeSession.cart];
                                                    const i = newCart.find(x => x.product.id === item.product.id)!;
                                                    i.discount = parseFloat(e.target.value) || 0;
                                                    updateActiveSession({ cart: newCart });
                                                }}
                                                className="w-12 h-6 text-center text-xs border rounded outline-none focus:border-orange-400 font-mono text-orange-600 bg-white dark:bg-surface-900"
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Totals & Actions Footer */}
                <div className="bg-white dark:bg-surface-900 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)] border-t z-10">
                    
                    <div className="p-4 space-y-2">
                        {/* Overall Discount Input */}
                        <div className="flex items-center justify-between text-xs mb-2 pb-2 border-b dashed">
                            <span className="text-surface-500 font-bold flex items-center gap-1">🏷️ {isRTL ? 'خصم إضافي (مبلغ)' : 'Extra Discount (Fixed)'}</span>
                            <div className="relative">
                                <input 
                                    id="invoice-discount-input"
                                    type="number" 
                                    min="0"
                                    value={activeSession.invoiceDiscount || ''}
                                    onChange={(e) => updateActiveSession({ invoiceDiscount: parseFloat(e.target.value) || 0 })}
                                    className="w-20 py-1 px-2 text-end bg-orange-50 border border-orange-200 text-orange-700 font-bold rounded focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex justify-between text-xs font-medium text-surface-500">
                            <span>{isRTL ? 'المجموع الأساسي' : 'Subtotal'}</span>
                            <span className="font-mono">{cartSubtotalExcl.toFixed(2)}</span>
                        </div>
                        {activeSession.invoiceDiscount > 0 && (
                            <div className="flex justify-between text-xs font-medium text-orange-500">
                                <span>{isRTL ? 'بعد الخصم الإضافي' : 'After Discount'}</span>
                                <span className="font-mono">{discountedExcl.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-xs font-medium text-purple-500">
                            <span>{isRTL ? '+ ضريبة القيمة المضافة (15%)' : '+ VAT (15%)'}</span>
                            <span className="font-mono">{cartVat.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-end pt-2 border-t font-black">
                            <span className="text-sm">{isRTL ? 'الإجمالي المطلوب' : 'Total Due'}</span>
                            <span className="text-3xl text-indigo-600 dark:text-indigo-400 tracking-tight">{cartTotal.toFixed(2)} <span className="text-xs">SAR</span></span>
                        </div>
                    </div>

                    <div className="p-3 bg-surface-50 dark:bg-surface-800 grid grid-cols-4 gap-2">
                        <button onClick={() => setShowHoldModal(true)} disabled={activeSession.cart.length===0} className="col-span-1 py-2 text-xs font-bold text-orange-600 bg-orange-100 hover:bg-orange-200 rounded-lg flex flex-col items-center justify-center gap-1 disabled:opacity-50 transition" title="F5">
                            <span>⏸</span> Hold
                        </button>
                        <button onClick={() => clearCart()} disabled={activeSession.cart.length===0} className="col-span-1 py-2 text-xs font-bold text-red-600 bg-red-100 hover:bg-red-200 rounded-lg flex flex-col items-center justify-center gap-1 disabled:opacity-50 transition" title="Delete">
                            <span>🗑️</span> Clear
                        </button>
                        <button onClick={() => {if(activeSession.cart.length>0) setShowPayment(true);}} disabled={activeSession.cart.length===0} className="col-span-2 py-3 text-sm font-black text-white bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-primary-500/30 transition transform hover:-translate-y-0.5" title="F8">
                            <span>💳</span> {isRTL ? 'دفع (F8)' : 'Pay (F8)'}
                        </button>
                    </div>

                </div>
            </div>

            {/* ─────────── Modal: Payment & Split ─────────── */}
            {showPayment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-surface-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-scale-in flex flex-col md:flex-row">
                        
                        {/* Summary Side */}
                        <div className="p-6 bg-surface-50 dark:bg-surface-950 md:w-2/5 border-e border-dashed flex flex-col justify-center text-center">
                            <p className="text-sm font-bold text-surface-500 uppercase tracking-widest">{isRTL ? 'المبلغ المطلوب' : 'Amount Due'}</p>
                            <p className="text-5xl font-black text-indigo-600 dark:text-indigo-400 my-4">{cartTotal.toFixed(2)}</p>
                            <p className="text-xs font-medium text-surface-400 mb-6 px-4 py-2 border rounded-full bg-white dark:bg-surface-800 self-center">
                                {activeSession.cart.reduce((a,c)=>a+c.qty,0)} Items
                            </p>
                            
                            {(activeSession.paymentType === 'cash' || activeSession.paymentType === 'split') && (
                                <div className="mt-auto p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 rounded-xl relative overflow-hidden">
                                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 opacity-80">{isRTL ? 'الباقي للعميل (الصرف)' : 'Change Return'}</p>
                                    <p className="text-3xl font-black text-emerald-600 mt-1">{change.toFixed(2)} <span className="text-sm">SAR</span></p>
                                </div>
                            )}
                        </div>

                        {/* Input Side */}
                        <div className="p-6 flex-1 flex flex-col">
                            <h2 className="text-lg font-bold mb-4">{isRTL ? 'طريقة الدفع' : 'Payment Method'}</h2>
                            
                            <div className="flex p-1 bg-surface-100 dark:bg-surface-800 rounded-xl mb-6 shadow-inner">
                                {['cash','card','split'].map((type) => (
                                    <button 
                                        key={type}
                                        onClick={() => updateActiveSession({ paymentType: type as any, cashPaid: type==='cash'? cartTotal.toFixed(2) : '', cardPaid: type==='card'? cartTotal.toFixed(2) : '' })}
                                        className={`flex-1 py-2.5 text-xs font-bold rounded-lg capitalize transition-all ${activeSession.paymentType === type ? 'bg-primary-500 text-white shadow-md' : 'text-surface-600 hover:bg-white'}`}
                                    >
                                        {type === 'cash' && '💵 '}
                                        {type === 'card' && '💳 '}
                                        {type === 'split' && '✂️ '}
                                        {isRTL && type === 'cash' ? 'كاش' : isRTL && type === 'card' ? 'شبكة' : isRTL ? 'مقسم' : type}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-4 mb-8">
                                {(activeSession.paymentType === 'cash' || activeSession.paymentType === 'split') && (
                                    <div>
                                        <label className="text-xs font-bold text-surface-500 ms-1 mb-1 block">💵 الكاش المستلم (Cash)</label>
                                        <input 
                                            type="number" autoFocus 
                                            value={activeSession.cashPaid} 
                                            onChange={(e) => updateActiveSession({ cashPaid: e.target.value })}
                                            className="w-full text-2xl font-black p-3 rounded-xl border-2 border-surface-200 focus:border-primary-500 bg-surface-50 focus:bg-white text-center tracking-wider outline-none" 
                                            placeholder="0.00"
                                        />
                                        {/* Quick Cash Buttons */}
                                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-3">
                                            <button onClick={()=>updateActiveSession({ cashPaid: cartTotal.toFixed(2) })} className="px-3 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-bold hover:bg-emerald-200 transition">Exact</button>
                                            {[10, 50, 100, 200, 500].map((am) => (
                                                <button key={am} onClick={()=>updateActiveSession({ cashPaid: am.toString() })} className="px-3 py-2 bg-surface-100 dark:bg-surface-800 hover:bg-primary-100 hover:text-primary-700 rounded-lg text-xs font-bold transition">{am}</button>
                                            ))}
                                            <button onClick={()=>updateActiveSession({ cashPaid: '' })} className="px-3 py-2 bg-red-50 text-red-500 rounded-lg text-xs font-bold hover:bg-red-500 hover:text-white transition">Clear</button>
                                        </div>
                                    </div>
                                )}

                                {activeSession.paymentType === 'split' && (
                                    <div>
                                        <label className="text-xs font-bold text-surface-500 ms-1 mb-1 block">💳 الشبكة المسحوبة (Card)</label>
                                        <input 
                                            type="number" 
                                            value={activeSession.cardPaid} 
                                            onChange={(e) => updateActiveSession({ cardPaid: e.target.value })}
                                            className="w-full text-2xl font-black p-3 rounded-xl border-2 border-surface-200 focus:border-primary-500 bg-surface-50 focus:bg-white text-center tracking-wider outline-none" 
                                            placeholder="0.00"
                                        />
                                        <button onClick={() => updateActiveSession({ cardPaid: Math.max(0, cartTotal - (parseFloat(activeSession.cashPaid||'0'))).toFixed(2) })} className="mt-2 text-xs font-bold text-primary-600 block text-center w-full hover:underline">
                                            Auto-fill remaining from card
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="mt-auto grid grid-cols-2 gap-3">
                                <button onClick={() => setShowPayment(false)} className="py-3 bg-surface-100 hover:bg-surface-200 text-surface-700 font-bold rounded-xl transition">
                                    {isRTL ? 'إلغاء (Esc)' : 'Cancel (Esc)'}
                                </button>
                                <button onClick={() => handleCompletePurchase(true)} className="py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 transition flex items-center justify-center gap-2 group relative overflow-hidden" title="F10">
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                    <span className="relative z-10 font-black">🖨️ {isRTL ? 'دفع وطباعة (F10)' : 'Pay & Print (F10)'}</span>
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            )}

            {/* ─────────── Modal: Hold Note ─────────── */}
            {showHoldModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-surface-900 w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-scale-in">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">⏸ {isRTL ? 'تعليق الفاتورة' : 'Hold Invoice'}</h2>
                        <input 
                            type="text" autoFocus 
                            placeholder={isRTL ? 'ملاحظة (مثال: العميل رايح يجيب المحفظة)' : 'Note (e.g. customer getting wallet)'}
                            value={holdNote} onChange={e=>setHoldNote(e.target.value)}
                            className="w-full p-3 rounded-lg border bg-surface-50 focus:border-primary-500 outline-none text-sm mb-6"
                        />
                        <div className="flex gap-3">
                            <button onClick={()=>setShowHoldModal(false)} className="flex-1 py-2 bg-surface-100 font-bold rounded-lg">{isRTL ? 'إلغاء' : 'Cancel'}</button>
                            <button onClick={holdCurrentInvoice} className="flex-1 py-2 bg-orange-500 text-white font-bold rounded-lg shadow-md hover:bg-orange-600">
                                {isRTL ? 'تعليق السلة' : 'Hold Cart'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─────────── Modal: Recall List ─────────── */}
            {showRecallList && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-surface-900 w-full max-w-2xl rounded-2xl shadow-2xl p-6 animate-scale-in">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold flex items-center gap-2">📃 {isRTL ? 'الفواتير المعلقة والنشطة' : 'Active & Held Invoices'}</h2>
                            <button onClick={()=>setShowRecallList(false)} className="text-surface-400 hover:text-red-500 font-bold">✕ إغلاق</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto p-1">
                            {sessions.map((sess, idx) => (
                                <div key={sess.id} onClick={() => { setActiveIdx(idx); setShowRecallList(false); }} className={`p-4 rounded-xl border-2 cursor-pointer transition flex flex-col gap-2 ${activeIdx === idx ? 'border-primary-500 bg-primary-50/50' : 'border-surface-200 hover:border-primary-300'}`}>
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-sm text-surface-800 dark:text-surface-200">
                                            {sess.isHeld && <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-[10px] me-2">معلقة</span>}
                                            {sess.title}
                                        </h3>
                                        <span className="text-xs font-black text-primary-600">{
                                            ((sess.cart.reduce((s,i) => s + (i.qty * i.product.price * (1 - i.discount/100)), 0) - sess.invoiceDiscount) * 1.15).toFixed(2)
                                        } ر.س</span>
                                    </div>
                                    <div className="text-xs text-surface-500 font-medium">
                                        {sess.cart.length} {isRTL ? 'صنف مستخدم' : 'Items'} | {sess.customerName || (isRTL ? 'بدون عميل' : 'No Customer')}
                                    </div>
                                    {sess.heldNote && <div className="text-xs italic bg-surface-100 p-1.5 rounded mt-1">"{sess.heldNote}"</div>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ─────────── Modal: ZATCA Auto-Print ─────────── */}
            {showPrint && printInvoiceData && (
                <InvoicePrintTemplate invoice={printInvoiceData} locale={locale} onClose={() => { setShowPrint(false); }} />
            )}

            {/* Global Quick Keys Hints (visible when keyboard is used or always small) */}
            <div className="fixed bottom-2 end-2 flex gap-1 z-50 pointer-events-none opacity-40 hover:opacity-100 transition scale-75 origin-bottom-right">
                <kbd className="bg-black/80 text-white px-2 py-1 rounded text-xs">F1: New</kbd>
                <kbd className="bg-black/80 text-white px-2 py-1 rounded text-xs">F2: Search</kbd>
                <kbd className="bg-black/80 text-white px-2 py-1 rounded text-xs">F6: Recall</kbd>
                <kbd className="bg-black/80 text-white px-2 py-1 rounded text-xs">F8: Pay</kbd>
            </div>
            
        </div>
    );
}
