'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
    Search, ShoppingCart, Plus, Minus, CreditCard,
    Banknote, Star, X, Check, Zap, User, LayoutGrid,
    Receipt, Moon, Sun, Tag, StickyNote, PauseCircle,
    PlayCircle, Printer, AlertTriangle, ChevronRight,
    ChevronLeft, Layers, Home, Package, Users, BarChart2,
    Settings, MoreHorizontal, CheckCircle2, ArrowRight,
    Trash2, FileText, Ban, Warehouse, Gift, RefreshCw,
    Building2, ArrowRightLeft, Activity, Undo2, ShoppingBag,
    Calculator, UserCheck, Briefcase, Store, Car, Lock
} from 'lucide-react';
import { inventoryApi, salesApi, crmApi, posApi } from '@/lib/api';
import clsx from 'clsx';
import Link from 'next/link';
import { PosSidebar } from './PosSidebar';
import { PosProductGrid } from './PosProductGrid';
import { VehicleSearchPanel } from './VehicleSearchPanel';
import { PosAlternativesModal } from './PosAlternativesModal';
import toast from 'react-hot-toast';
import { ShiftManagementModal } from './ShiftManagementModal';
import { cacheProducts, cacheCustomers, getCachedProducts, getCachedCustomers, searchCachedCustomers, enqueueOfflineAction, getSyncQueue, removeFromQueue } from '@/lib/offline-store';
import { useRegionalSettings } from '@/providers/RegionalSettingsProvider';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CartItem {
    id: string; product: any; quantity: number; price: number;
    note?: string; discount?: number; maxReturnQty?: number;
    coreReturned?: boolean;
}
interface InvoiceTab {
    id: string; label: string; cart: CartItem[]; customer: any | null;
    orderNote: string; isTaxInvoice: boolean; priceLevel: PriceLevel;
    orderDiscount: number; orderTax: number; createdAt: Date;
    warehouseId: string | null; isRefundMode?: boolean;
    invoiceId?: string; originalInvoiceNumber?: string;
    salesChannelId?: string; selectedVehicleId?: string;
}
type PriceLevel = 'retail' | 'half_wholesale' | 'wholesale';
interface HeldOrder { 
    id: string; label: string; cart: CartItem[]; customer: any; 
    priceLevel: PriceLevel; createdAt: Date; warehouseId: string | null;
}

// ─── Price Levels ─────────────────────────────────────────────────────────────
const PRICE_LEVELS = [
    { id: 'retail'         as PriceLevel, ar: 'قطاعي',   en: 'Retail',    activeClass: 'bg-blue-600 text-white shadow-xl shadow-blue-600/30 scale-105',   badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400' },
    { id: 'half_wholesale' as PriceLevel, ar: 'نص جملة', en: 'Semi W/S',  activeClass: 'bg-amber-500 text-white shadow-xl shadow-amber-500/30 scale-105',  badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' },
    { id: 'wholesale'      as PriceLevel, ar: 'جملة',    en: 'Wholesale', activeClass: 'bg-emerald-600 text-white shadow-xl shadow-emerald-600/30 scale-105', badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' },
];

function getProductPrice(product: any, level: PriceLevel): number {
    const retail = parseFloat(product.sellPrice || product.sell_price || product.price || 0);
    if (level === 'wholesale')      return parseFloat(product.wholesalePrice || product.wholesale_price || '') || retail * 0.80;
    if (level === 'half_wholesale') return parseFloat(product.semiWholesalePrice || product.semi_wholesale_price || '') || retail * 0.90;
    return retail;
}

function getProductPriceWithChannel(product: any, level: PriceLevel, channelId: string | undefined, salesChannels: any[], defaultTaxRate = 15): number {
    let basePrice = getProductPrice(product, level);
    if (!channelId || !salesChannels) return basePrice;
    const channel = salesChannels.find(c => c.id === channelId);
    if (!channel) return basePrice;

    if (channel.pricing_method === 'percentage') {
        return basePrice * (1 + (channel.markup_percentage / 100));
    } else {
        if (channel.apply_before_tax) {
            return basePrice + channel.fixed_markup;
        } else {
            const vatRate = product.vat_rate || defaultTaxRate;
            return basePrice + (channel.fixed_markup / (1 + (vatRate / 100)));
        }
    }
}

const PRODUCTS_PER_PAGE = 30;

const generateNewTab = (currentTabs: InvoiceTab[] = [], o: Partial<InvoiceTab> = {}): InvoiceTab => {
    let nextNum = 1;
    if (currentTabs && currentTabs.length > 0) {
        const nums = currentTabs.map(t => parseInt(t.label.replace('#', '')) || 0);
        nextNum = Math.max(...nums, 0) + 1;
    }
    return {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        label: `#${nextNum}`, cart: [], customer: null, warehouseId: null,
        orderNote: '', isTaxInvoice: false, priceLevel: 'retail',
        orderDiscount: 0, orderTax: 0, createdAt: new Date(), salesChannelId: undefined, ...o,
    };
};

export default function ProPosScreen({ dict, locale }: { dict: any; locale: string }) {
    const isRTL = locale === 'ar';
    const { taxRate, currencySymbol } = useRegionalSettings();
    const [products,   setProducts]   = useState<any[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [customers,  setCustomers]  = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [salesChannels, setSalesChannels] = useState<any[]>([]);
    const [loading,    setLoading]    = useState(true);
    const [tabs, setTabs]               = useState<InvoiceTab[]>([generateNewTab([])]);
    const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0]?.id ?? '');
    const [heldOrders, setHeldOrders]   = useState<HeldOrder[]>([]);
    const activeTab = tabs.find(t => t.id === activeTabId) ?? tabs[0];

    const updateTab = useCallback(<K extends keyof InvoiceTab>(field: K, value: InvoiceTab[K]) => {
        setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, [field]: value } : t));
    }, [activeTabId]);

    const [activeCategory,    setActiveCategory]    = useState('all');
    const [searchQuery,       setSearchQuery]       = useState('');
    const [currentPage,       setCurrentPage]       = useState(1);
    const [showChannelSelect, setShowChannelSelect] = useState(false);
    const [showCustomerSearch,setShowCustomerSearch]= useState(false);
    const [customerQuery,     setCustomerQuery]     = useState('');
    const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
    const [isAddingCustomer,  setIsAddingCustomer]  = useState(false);
    const [newCustomer,       setNewCustomer]       = useState({ name: '', phone: '' });
    const [isSavingCustomer,  setIsSavingCustomer]  = useState(false);
    const [showHoldPanel,     setShowHoldPanel]     = useState(false);
    const [showPaymentModal,  setShowPaymentModal]  = useState(false);
    const [paymentMethod,     setPaymentMethod]     = useState<'cash' | 'card' | 'other'>('cash');
    const [receivedAmount,    setReceivedAmount]    = useState('');
    const [payNumPad,         setPayNumPad]         = useState('');
    const [isSaving,          setIsSaving]          = useState(false);
    const [showSuccess,       setShowSuccess]       = useState(false);
    const [isDark,            setIsDark]            = useState(false);
    const [editingItem,       setEditingItem]       = useState<CartItem | null>(null);
    const [editItemSubState,  setEditItemSubState]  = useState({ discount: 0, note: '' });
    
    // Strict Returns
    const [showReturnModal,   setShowReturnModal]   = useState(false);
    const [returnSearchQuery, setReturnSearchQuery] = useState('');
    const [isSearchingReturn, setIsSearchingReturn] = useState(false);
    
    // Shift Management
    const [currentShift, setCurrentShift] = useState<any>(null);
    const [showShiftModal, setShowShiftModal] = useState(false);
    const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
    const [closingCash, setClosingCash] = useState('');
    const [isClosingShift, setIsClosingShift] = useState(false);

    // Offline Sync
    const [isOnline, setIsOnline] = useState(true);
    const [pendingSyncCount, setPendingSyncCount] = useState(0);
    const [isSyncingQueue, setIsSyncingQueue] = useState(false);

    const [customerVehicles, setCustomerVehicles] = useState<any[]>([]);
    const [alternativesProduct, setAlternativesProduct] = useState<any>(null);
    
    useEffect(() => {
        const customer = activeTab?.customer;
        if (!customer?.id) {
            setCustomerVehicles([]);
            if (activeTab?.selectedVehicleId) updateTab('selectedVehicleId', undefined);
            return;
        }
        crmApi.getCustomerVehicles(customer.id)
            .then(res => setCustomerVehicles(res.data?.data || []))
            .catch(() => setCustomerVehicles([]));
    }, [activeTab?.customer?.id]);

    // Vehicle Search Panel
    const [showVehicleSearch, setShowVehicleSearch] = useState(false);
    
    const searchRef = useRef<HTMLInputElement>(null);
    const barcodeBuffer = useRef('');
    const barcodeTimeout = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const [pRes, cRes, wRes, chRes] = await Promise.all([
                    inventoryApi.getProducts(), 
                    crmApi.getCustomers({ limit: 50 }), // Load top 50 initially for fast offline fallback
                    inventoryApi.getWarehouses(),
                    salesApi.getSalesChannels({ active_only: true }).catch(() => ({ data: { data: [] } }))
                ]);
                const prods = Array.isArray(pRes.data?.data?.data) ? pRes.data.data.data : Array.isArray(pRes.data?.data) ? pRes.data.data : [];
                setProducts(prods);
                setCustomers(Array.isArray(cRes.data?.data?.data) ? cRes.data.data.data : Array.isArray(cRes.data?.data) ? cRes.data.data : []);
                setWarehouses(Array.isArray(wRes.data?.data) ? wRes.data.data : Array.isArray(wRes.data) ? wRes.data : []);
                
                const channels = chRes?.data?.data || [];
                setSalesChannels(channels);

                const cats = Array.from(new Set(prods.map((p: any) => p.category_name || p.category_id).filter(Boolean))) as string[];
                setCategories(['all', ...cats]);
                
                // Cache data
                if (prods.length > 0) cacheProducts(prods);
                if (customers.length > 0) cacheCustomers(customers);
            } catch (e) {
                // Offline fallback
                const cachedProds = await getCachedProducts();
                const cachedCusts = await getCachedCustomers();
                if (cachedProds.length > 0) {
                    setProducts(cachedProds);
                    const cats = Array.from(new Set(cachedProds.map((p: any) => p.category_name || p.category_id).filter(Boolean))) as string[];
                    setCategories(['all', ...cats]);
                }
                if (cachedCusts.length > 0) setCustomers(cachedCusts);
            } finally { setLoading(false); }
        })();
        
        posApi.getCurrentShift().then(res => {
            if (!res.data?.data) {
                setShowShiftModal(true);
            } else {
                setCurrentShift(res.data.data);
            }
        }).catch(() => setShowShiftModal(true));

        const isDarkEnv = document.documentElement.classList.contains('dark');
        setIsDark(isDarkEnv);
    }, []);

    // Debounced Customer Search
    useEffect(() => {
        if (customerQuery.length < 2) return;
        const timer = setTimeout(async () => {
            setIsSearchingCustomer(true);
            try {
                const res = await crmApi.getCustomers({ search: customerQuery, limit: 20 });
                const fetched = Array.isArray(res.data?.data?.data) ? res.data.data.data : Array.isArray(res.data?.data) ? res.data.data : [];
                // Merge with existing avoiding duplicates
                setCustomers(prev => {
                    const existingIds = new Set(prev.map(c => c.id));
                    const newCustomers = fetched.filter((c: any) => !existingIds.has(c.id));
                    return [...newCustomers, ...prev];
                });
                cacheCustomers(fetched);
            } catch (e) {
                const offlineHits = await searchCachedCustomers(customerQuery);
                setCustomers(prev => {
                    const existingIds = new Set(prev.map(c => c.id));
                    const newCustomers = offlineHits.filter((c: any) => !existingIds.has(c.id));
                    return [...newCustomers, ...prev];
                });
            } finally {
                setIsSearchingCustomer(false);
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [customerQuery]);


    // Offline Sync
    const refreshPendingSyncCount = useCallback(async () => {
        const queue = await getSyncQueue();
        setPendingSyncCount(queue.length);
    }, []);

    const syncOfflineQueue = useCallback(async () => {
        const queue = await getSyncQueue();
        if (queue.length === 0) return;
        setIsSyncingQueue(true);
        let success = 0;
        for (const q of queue) {
            try {
                if (q.type === 'return') await salesApi.createReturn(q.payload);
                else if (q.type === 'quotation') await salesApi.createQuotation(q.payload);
                else await salesApi.createInvoice(q.payload);
                await removeFromQueue(q.id as number);
                success++;
            } catch (e: any) {
                if (e.response?.status === 428) {
                    await removeFromQueue(q.id as number);
                    success++;
                    toast.success(isRTL ? 'تم حفظ إحدى الفواتير للموافقة.' : 'An offline invoice was sent for approval.');
                }
                // Other errors (still offline / server rejected): leave it queued for the next attempt.
            }
        }
        if (success > 0) {
            toast.success(isRTL ? `تمت مزامنة ${success} من الفواتير المتأخرة بنجاح!` : `Successfully synced ${success} offline invoices!`);
        }
        await refreshPendingSyncCount();
        setIsSyncingQueue(false);
    }, [isRTL, refreshPendingSyncCount]);

    useEffect(() => {
        setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
        refreshPendingSyncCount();

        const handleOnline = () => { setIsOnline(true); syncOfflineQueue(); };
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [syncOfflineQueue, refreshPendingSyncCount]);

    useEffect(() => {
        const h = (e: KeyboardEvent) => {
            if (showPaymentModal) return;
            if (e.key === 'F1') { e.preventDefault(); if (activeTab?.cart.length) setShowPaymentModal(true); }
            if (e.key === 'F2') { e.preventDefault(); updateTab('cart', []); }
            if (e.key === 'F3') { e.preventDefault(); addNewTab(); }
            if (e.key === 'F5') { e.preventDefault(); searchRef.current?.focus(); }
            if (e.key === 'Escape') { setShowCustomerSearch(false); setShowHoldPanel(false); }
        };
        window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
    }, [activeTab?.cart.length, showPaymentModal, activeTabId]);

    const toggleTheme = () => { const n = !isDark; setIsDark(n); document.documentElement.classList.toggle('dark', n); localStorage.setItem('theme', n ? 'dark' : 'light'); };

    const handleCloseShift = async () => {
        if (!closingCash) {
            toast.error(isRTL ? 'يجب إدخال رصيد الصندوق الختامي' : 'Closing cash is required');
            return;
        }
        if (pendingSyncCount > 0) {
            toast.error(isRTL ? `يوجد ${pendingSyncCount} فاتورة غير مُزامنة. يرجى الانتظار حتى تتم المزامنة قبل إغلاق الوردية.` : `${pendingSyncCount} invoice(s) are not yet synced. Please wait for sync before closing the shift.`);
            return;
        }
        setIsClosingShift(true);
        try {
            await posApi.closeShift({ closing_cash: parseFloat(closingCash) });
            toast.success(isRTL ? 'تم إغلاق الوردية بنجاح' : 'Shift closed successfully');
            setCurrentShift(null);
            setShowCloseShiftModal(false);
            setClosingCash('');
            setShowShiftModal(true);
        } catch (error: any) {
            toast.error(error.response?.data?.message || (isRTL ? 'حدث خطأ' : 'An error occurred'));
        } finally {
            setIsClosingShift(false);
        }
    };
    const addNewTab = () => { setTabs(prev => { const t = generateNewTab(prev); setActiveTabId(t.id); return [...prev, t]; }); };

    const closeTab = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setTabs(prev => {
            if (prev.length === 1) {
                const newTab = generateNewTab([]);
                setActiveTabId(newTab.id);
                return [newTab];
            }
            const idx = prev.findIndex(t => t.id === id);
            const rest = prev.filter(t => t.id !== id);
            if (activeTabId === id) {
                setActiveTabId(rest[Math.max(0, idx - 1)].id);
            }
            return rest;
        });
    };

    const saveItemConfig = () => {
        if (!editingItem) return;
        setTabs(prev => prev.map(t => t.id !== activeTabId ? t : { ...t, cart: t.cart.map(i => i.id === editingItem.id ? { ...i, discount: editItemSubState.discount, note: editItemSubState.note } : i) }));
        setEditingItem(null);
    };

    const handleCreateCustomer = async () => {
        if (!newCustomer.name) return;
        setIsSavingCustomer(true);
        try {
            const res = await crmApi.createCustomer({ name: newCustomer.name, phone: newCustomer.phone, type: 'individual' });
            const created = res.data?.data || res.data;
            if(created && created.id) {
                setCustomers(prev => [...prev, created]);
                updateTab('customer', created);
                setIsAddingCustomer(false);
                setShowCustomerSearch(false);
                setNewCustomer({ name: '', phone: '' });
            }
        } catch (error) {

            toast.error(isRTL ? 'فشل إضافة العميل' : 'Failed to add customer');
        } finally {
            setIsSavingCustomer(false);
        }
    };

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const catOk = activeCategory === 'all' || p.category_name === activeCategory || p.category_id === activeCategory;
            const q = searchQuery.toLowerCase();
            return catOk && (!q || p.name?.toLowerCase().includes(q) || p.name_ar?.includes(searchQuery) || p.barcode?.includes(searchQuery) || p.code?.toLowerCase().includes(q));
        });
    }, [products, activeCategory, searchQuery]);

    const totalPages    = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));
    const pagedProducts = filteredProducts.slice((currentPage - 1) * PRODUCTS_PER_PAGE, currentPage * PRODUCTS_PER_PAGE);
    useEffect(() => { setCurrentPage(1); }, [activeCategory, searchQuery]);

    const cartQtyMap = useMemo(() => {
        const m: Record<string, number> = {};
        (activeTab?.cart || []).forEach(i => { m[i.product.id] = (m[i.product.id] || 0) + i.quantity; });
        return m;
    }, [activeTab?.cart]);

    const changePriceLevel = useCallback((level: PriceLevel) => {
        setTabs(prev => prev.map(t => t.id !== activeTabId ? t : { ...t, priceLevel: level, cart: t.cart.map(i => ({ ...i, price: getProductPriceWithChannel(i.product, level, t.salesChannelId, salesChannels, taxRate) })) }));
    }, [activeTabId, salesChannels]);

    const changeSalesChannel = useCallback((channelId: string | undefined) => {
        setTabs(prev => prev.map(t => t.id !== activeTabId ? t : { ...t, salesChannelId: channelId, cart: t.cart.map(i => ({ ...i, price: getProductPriceWithChannel(i.product, t.priceLevel, channelId, salesChannels, taxRate) })) }));
        setShowChannelSelect(false);
    }, [activeTabId, salesChannels]);

    const addToCart = useCallback((product: any, qty = 1) => {
        if (!currentShift) {
            toast.error(isRTL ? 'يجب فتح وردية أولاً' : 'You must open a shift first');
            setShowShiftModal(true);
            return;
        }
        setTabs(prev => prev.map(t => {
            if (t.id !== activeTabId) return t;
            const price = getProductPriceWithChannel(product, t.priceLevel, t.salesChannelId, salesChannels, taxRate);
            const exist = t.cart.find(i => i.product.id === product.id);
            if (exist) return { ...t, cart: t.cart.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + qty } : i) };
            return { ...t, cart: [...t.cart, { id: Math.random().toString(36).slice(2), product, quantity: qty, price }] };
        }));
    }, [activeTabId, salesChannels]);

    // API barcode scan — called when scanned code isn't in the local product list
    const handleBarcodeScan = useCallback(async (code: string) => {
        const warehouseId = activeTab?.warehouseId ?? null;
        try {
            const res = await posApi.scanBarcode(code, warehouseId);
            const item = res.data?.data;
            if (!item) {
                toast.error(isRTL ? `لم يُعثر على: ${code}` : `Not found: ${code}`);
                return;
            }
            if (!item.is_active) {
                toast.error(isRTL
                    ? `تحذير: المنتج "${item.name_ar || item.name}" غير نشط`
                    : `Warning: "${item.name}" is inactive`);
            }
            if (item.superseded_by) {
                toast(isRTL
                    ? `هذا المنتج استُبدل بـ: ${item.superseded_by.name_ar || item.superseded_by.name}`
                    : `Replaced by: ${item.superseded_by.name}`,
                    { icon: '⚠️', duration: 5000 });
            }
            const product = {
                id: item.product_id,
                name: item.name,
                name_ar: item.name_ar,
                sku: item.sku,
                barcode: item.barcode,
                sell_price: item.sell_price,
                wholesale_price: item.wholesale_price,
                semi_wholesale_price: item.semi_wholesale_price,
                vat_rate: item.vat_rate,
                has_core_charge: item.has_core_charge,
                core_charge_amount: item.core_charge_amount,
                image_url: item.image_url,
                unit_of_measure: item.unit_of_measure,
            };
            addToCart(product, item.quantity);
        } catch (e: any) {
            toast.error(isRTL ? `لم يُعثر على باركود: ${code}` : `Barcode not found: ${code}`);
        }
    }, [activeTab?.warehouseId, addToCart, isRTL]);

    // Global Barcode Listener (Moved here to have access to addToCart)
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (showPaymentModal || isAddingCustomer || showHoldPanel) return;
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            if (e.key === 'Enter' && barcodeBuffer.current.length > 2) {
                const code = barcodeBuffer.current;
                barcodeBuffer.current = '';
                // Fast path: product already loaded in the grid
                const matched = products.find(p => p.barcode === code || p.sku === code || p.code === code);
                if (matched) {
                    addToCart(matched);
                } else {
                    // Slow path: fetch from backend (handles unit barcodes, SKUs not in grid, etc.)
                    handleBarcodeScan(code);
                }
            } else if (e.key.length === 1) {
                barcodeBuffer.current += e.key;
                if (barcodeTimeout.current) clearTimeout(barcodeTimeout.current);
                barcodeTimeout.current = setTimeout(() => { barcodeBuffer.current = ''; }, 100);
            }
        };
        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [products, addToCart, handleBarcodeScan, showPaymentModal, isAddingCustomer, showHoldPanel]);

    const updateQty = (id: string, d: number) => setTabs(prev => prev.map(t => {
        if (t.id !== activeTabId) return t;
        const newCart = t.cart.map(i => {
            if (i.id !== id) return i;
            let nq = i.quantity + d;
            if (t.isRefundMode && i.maxReturnQty && nq > i.maxReturnQty) nq = i.maxReturnQty;
            return { ...i, quantity: Math.max(1, nq) };
        });
        return { ...t, cart: newCart };
    }));
    
    // Summary math
    const cart = activeTab?.cart || [];
    const activeChannel = salesChannels.find(c => c.id === activeTab?.salesChannelId);

    // Calculate item prices including channel markup
    const cartWithMarkup = cart.map(i => {
        const basePrice = parseFloat(i.price as any) || 0;
        let markup = 0;
        if (activeChannel) {
            markup = activeChannel.pricing_method === 'percentage' 
                ? basePrice * (activeChannel.markup_percentage / 100) 
                : activeChannel.fixed_markup;
        }
        let coreCharge = 0;
        if (i.product?.has_core_charge && i.coreReturned === false) {
            coreCharge = parseFloat(i.product.core_charge_amount) || 0;
        }

        return {
            ...i,
            basePrice,
            markup,
            coreCharge,
            adjustedPrice: basePrice + markup + coreCharge
        };
    });

    const itemsSubt = cartWithMarkup.reduce((s, i) => s + (i.adjustedPrice * i.quantity) - (i.discount || 0), 0);
    const globalDiscAmount = parseFloat(activeTab?.orderDiscount as any) || 0;
    const finalSubt = Math.max(0, itemsSubt - globalDiscAmount);
    const vat = finalSubt * (taxRate / 100);
    const total = finalSubt + vat;

    const handlePayNumPad = (k: string) => {
        if (k === 'C')  { setPayNumPad(''); setReceivedAmount(''); return; }
        if (k === '⌫') { const v = payNumPad.slice(0, -1); setPayNumPad(v); setReceivedAmount(v); return; }
        const next = payNumPad + k; setPayNumPad(next); setReceivedAmount(next);
    };

    const fetchOriginalInvoice = async () => {
        if (!returnSearchQuery) return;
        setIsSearchingReturn(true);
        try {
            const res = await salesApi.getInvoices({ invoice_number: returnSearchQuery, status: 'confirmed' });
            const invoices = res.data?.data?.data || res.data?.data || [];
            if (invoices.length > 0) {
                const inv = invoices[0];
                const cartItems = inv.items.map((i: any) => ({
                    id: Math.random().toString(36).slice(2),
                    product: i.product,
                    quantity: parseFloat(i.quantity) || 1,
                    maxReturnQty: parseFloat(i.quantity) || 1,
                    price: parseFloat(i.unit_price) || parseFloat(i.product?.price || 0) || 0,
                    discount: parseFloat(i.discount_percent) > 0 ? ((parseFloat(i.unit_price) * parseFloat(i.quantity)) * (parseFloat(i.discount_percent)/100)) : 0
                }));
                
                const returnTab = generateNewTab([], {
                    isRefundMode: true,
                    invoiceId: inv.id,
                    originalInvoiceNumber: inv.invoice_number,
                    customer: inv.customer,
                    warehouseId: inv.warehouse_id,
                    cart: cartItems
                });
                
                setTabs(prev => [...prev, returnTab]);
                setActiveTabId(returnTab.id);
                setShowReturnModal(false);
                setReturnSearchQuery('');
            } else {
                toast.success(isRTL ? 'الفاتورة غير موجودة أو غير مكتملة.' : 'Invoice not found or not confirmed.');
            }
        } catch (e) {

            toast.error(isRTL ? 'فشل جلب الفاتورة.' : 'Failed to fetch invoice.');
        } finally {
            setIsSearchingReturn(false);
        }
    };

    const handleCheckout = async () => {
        if (!cart.length) return;
        setIsSaving(true);
        const isRefund = activeTab?.isRefundMode;
        let payload: any = null;
        try {
            payload = {
                offline_id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
                invoice_number: 'POS-' + Date.now(), invoice_date: new Date().toISOString().split('T')[0],
                customer_id: activeTab?.customer?.id || null, warehouse_id: activeTab?.warehouseId || null,
                invoice_id: activeTab?.invoiceId || null,
                price_level: activeTab?.priceLevel, discount: activeTab?.orderDiscount || 0, tax_amount: vat, total, payment_method: paymentMethod, status: 'confirmed',
                type: paymentMethod === 'cash' ? 'cash' : 'credit',
                paid_amount: total,
                sales_channel_id: activeTab?.salesChannelId || null,
                items: cartWithMarkup.map(i => ({ 
                    product_id: i.product.id, 
                    quantity: i.quantity, 
                    unit_price: i.adjustedPrice, 
                    base_unit_price: i.basePrice, 
                    adjusted_unit_price: i.adjustedPrice, 
                    adjustment_amount: i.markup,
                    core_charge_applied: i.coreCharge > 0,
                    core_charge_amount: i.coreCharge,
                    discount: i.discount || 0, 
                    total_price: ((i.adjustedPrice || 0) * i.quantity) - (i.discount || 0) 
                })),
                note: activeTab?.orderNote || '',
            };

            // Thermal Print Receipt
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
            const doc = iframe.contentWindow?.document;
            if (doc) {
                doc.open();
                doc.write(`
                    <!DOCTYPE html>
                    <html dir="rtl">
                    <head>
                        <style>
                            @page { margin: 0; }
                            body { font-family: sans-serif; font-size: 12px; width: 80mm; margin: 0; padding: 10px; color: #000; }
                            .center { text-align: center; } .bold { font-weight: bold; }
                            .flex { display: flex; justify-content: space-between; }
                            .dashed { border-top: 1px dashed #000; margin: 8px 0; }
                        </style>
                    </head>
                    <body>
                        <div class="center bold" style="font-size:16px;">مؤسسة النظام المتقدم</div>
                        <div class="center" style="margin-bottom:8px;">الرقم الضريبي: 300000000000003</div>
                        <div class="center bold">فاتورة مبيعات ${isRefund ? '(مسترجع)' : ''}</div>
                        <div class="dashed"></div>
                        <div class="flex"><span>التاريخ:</span><span>${payload.invoice_date}</span></div>
                        <div class="flex"><span>رقم:</span><span>${payload.invoice_number}</span></div>
                        <div class="dashed"></div>
                        ${cartWithMarkup.map((i:any) => 
                            '<div class="flex" style="margin-bottom:4px;">' +
                                '<span>' + (i.product.name_ar || i.product.name) + ' x' + (i.quantity) + '</span>' +
                                '<span>' + (((i.adjustedPrice * i.quantity) - (i.discount || 0)).toFixed(2)) + '</span>' +
                            '</div>'
                        ).join('')}
                        <div class="dashed"></div>
                        <div class="flex"><span>المجموع:</span><span>${itemsSubt.toFixed(2)}</span></div>
                        <div class="flex"><span>الضريبة (${taxRate}%):</span><span>${vat.toFixed(2)}</span></div>
                        ${globalDiscAmount > 0 ? `<div class="flex"><span>خصم:</span><span>-${globalDiscAmount.toFixed(2)}</span></div>` : ''}
                        <div class="dashed"></div>
                        <div class="flex bold" style="font-size:14px;"><span>الإجمالي المستحق:</span><span>${total.toFixed(2)} ${currencySymbol}</span></div>
                        <div class="flex" style="margin-top:8px;"><span>طريقة الدفع:</span><span>${paymentMethod}</span></div>
                        <div class="center" style="margin-top:15px; font-weight:bold;">شكراً لزيارتكم</div>
                    </body>
                    </html>
                `);
                doc.close();
                iframe.onload = () => {
                    iframe.contentWindow?.focus();
                    iframe.contentWindow?.print();
                    setTimeout(() => { document.body.removeChild(iframe); }, 3000);
                };
            }

            if (typeof navigator !== 'undefined' && !navigator.onLine) {
                await enqueueOfflineAction(isRefund ? 'return' : 'invoice', payload);
                await refreshPendingSyncCount();
            } else {
                if (isRefund) {
                    await salesApi.createReturn(payload);
                } else {
                    const invoiceResult = await salesApi.createInvoice(payload);
                    if (activeTab?.selectedVehicleId && invoiceResult?.data?.data?.id) {
                        try {
                            await crmApi.addVehicleService(
                                activeTab.customer.id,
                                activeTab.selectedVehicleId,
                                {
                                    invoice_id: invoiceResult.data.data.id,
                                    service_date: new Date().toISOString().split('T')[0],
                                    service_type: 'parts_replacement',
                                    description: `فاتورة رقم ${invoiceResult.data.data.invoice_number}`,
                                }
                            );
                        } catch (e) {
                            console.warn('Failed to log service history', e);
                        }
                    }
                }
            }
            setShowSuccess(true);
            setTimeout(() => {
                setShowSuccess(false);
                setTabs(prev => prev.map(t => t.id !== activeTabId ? t : { ...t, cart: [], customer: null, orderDiscount: 0, orderNote: '', isRefundMode: false }));
                setShowPaymentModal(false);
                setReceivedAmount('');
                setPayNumPad('');
            }, 2000);
        } catch (e: any) {
            if (e.response?.status === 428) {
                toast.success(isRTL ? 'تم الحفظ كمسودة وإرسالها للمدير للموافقة.' : 'Saved as draft and sent to manager for approval.');
                setShowSuccess(true);
                setTimeout(() => {
                    setShowSuccess(false);
                    setTabs(prev => prev.map(t => t.id !== activeTabId ? t : { ...t, cart: [], customer: null, orderDiscount: 0, orderNote: '', isRefundMode: false }));
                    setShowPaymentModal(false);
                    setReceivedAmount('');
                    setPayNumPad('');
                }, 2000);
            } else if (!e.response && payload) {
                // No response reached the browser at all - treat as a connectivity failure
                // even though navigator.onLine reported true, and fall back to the offline queue
                // instead of losing the sale.
                try {
                    await enqueueOfflineAction(isRefund ? 'return' : 'invoice', payload);
                    await refreshPendingSyncCount();
                    setIsOnline(false);
                    toast.success(isRTL ? 'تعذر الوصول للسيرفر. تم حفظ الفاتورة محلياً وستتم مزامنتها تلقائياً.' : 'Could not reach the server. Invoice saved offline and will sync automatically.');
                    setShowSuccess(true);
                    setTimeout(() => {
                        setShowSuccess(false);
                        setTabs(prev => prev.map(t => t.id !== activeTabId ? t : { ...t, cart: [], customer: null, orderDiscount: 0, orderNote: '', isRefundMode: false }));
                        setShowPaymentModal(false);
                        setReceivedAmount('');
                        setPayNumPad('');
                    }, 2000);
                } catch {
                    toast.error(isRTL ? 'فشل حفظ الفاتورة محلياً.' : 'Failed to save the invoice offline.');
                }
            } else {
                toast.error(e.response?.data?.message || 'Error processing payment.');
            }
        } finally {
            setIsSaving(false);
        }
    };

    const filteredCustomers = customers.filter(c => !customerQuery || c.name?.toLowerCase().includes(customerQuery.toLowerCase()) || c.phone?.includes(customerQuery));

    if (loading) return <div className="h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center"><RefreshCw className="w-12 h-12 animate-spin text-blue-500"/></div>;

    return (
        <div className={clsx('flex h-screen overflow-hidden font-sans antialiased bg-slate-50 dark:bg-[#0a0a10]', isRTL ? 'flex-row-reverse' : 'flex-row')}>
            
            <ShiftManagementModal isOpen={showShiftModal} isRTL={isRTL} onShiftOpened={(s) => { setCurrentShift(s); setShowShiftModal(false); }} />

            {showCloseShiftModal && (
                <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#1a1a2e] w-full max-w-md rounded-2xl shadow-2xl p-6 border border-slate-200 dark:border-white/10">
                        <div className="flex flex-col items-center justify-center mb-6 text-center">
                            <div className="w-16 h-16 bg-rose-100 dark:bg-rose-500/20 text-rose-600 rounded-full flex items-center justify-center mb-4">
                                <Lock className="w-8 h-8" />
                            </div>
                            <h2 className="text-xl font-black text-slate-800 dark:text-white">
                                {isRTL ? 'إغلاق الوردية الحالية' : 'Close Current Shift'}
                            </h2>
                            {pendingSyncCount > 0 && (
                                <p className="text-xs text-rose-600 dark:text-rose-400 mt-2 font-bold">
                                    {isRTL ? `يوجد ${pendingSyncCount} فاتورة غير مُزامنة بعد.` : `${pendingSyncCount} invoice(s) are not synced yet.`}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-white/80 mb-1.5">
                                {isRTL ? 'رصيد الصندوق الختامي' : 'Closing Cash Balance'}
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={closingCash}
                                    onChange={e => setClosingCash(e.target.value)}
                                    className="w-full h-12 px-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-lg font-black text-slate-800 dark:text-white outline-none focus:border-rose-500 transition-all text-center"
                                    placeholder="0.00"
                                />
                                <div className="absolute top-1/2 -translate-y-1/2 left-4 text-xs font-bold text-slate-400">{currencySymbol}</div>
                            </div>
                        </div>
                        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-white/5 flex gap-3">
                            <button
                                onClick={() => { setShowCloseShiftModal(false); setClosingCash(''); }}
                                className="flex-1 h-12 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-white rounded-xl text-sm font-black transition-all"
                            >
                                {isRTL ? 'إلغاء' : 'Cancel'}
                            </button>
                            <button
                                onClick={handleCloseShift}
                                disabled={isClosingShift || !closingCash}
                                className="flex-1 h-12 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-rose-600/30"
                            >
                                {isClosingShift ? <RefreshCw className="w-5 h-5 animate-spin" /> : (isRTL ? 'تأكيد الإغلاق' : 'Confirm Close')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* THIN APP SIDEBAR */}
            <PosSidebar locale={locale} isRTL={isRTL} />

            {/* ──────────────────────────────────────────────────────────────
                1. ORDER PANEL (CART) - Forced Physical Left in RTL
            ────────────────────────────────────────────────────────────── */}
            <div className="w-[340px] xl:w-[400px] shrink-0 flex flex-col border-e border-slate-200 dark:border-white/10 bg-white dark:bg-[#111118] relative z-10 shadow-2xl">
                
                {/* TABS */}
                <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/20 p-2 shrink-0 max-h-48 overflow-y-auto no-scrollbar">
                    {tabs.map(tab => (
                        <div key={tab.id} onClick={() => setActiveTabId(tab.id)} 
                            className={clsx('px-4 py-2.5 text-[11px] font-black rounded-lg transition-all flex items-center gap-2 cursor-pointer group', 
                            tab.id === activeTabId ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 dark:text-white/50 hover:bg-slate-200 dark:hover:bg-white/5'
                        )}>
                            {tab.label}
                            {tab.cart.length > 0 && <span className={clsx("px-1.5 py-0.5 rounded-full text-[10px]", tab.id === activeTabId ? "bg-white/20 text-white" : "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400")}>{tab.cart.reduce((s,i)=>s+i.quantity,0)}</span>}
                            <button onClick={(e) => closeTab(tab.id, e)} className={clsx("w-4 h-4 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-all", tab.id === activeTabId ? "hover:bg-blue-700 text-white" : "hover:bg-slate-300 dark:hover:bg-white/10 text-red-500")}><X className="w-3 h-3" /></button>
                        </div>
                    ))}
                    <button onClick={addNewTab} className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:text-white/30 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5 transition-colors"><Plus className="w-5 h-5"/></button>
                </div>

                {/* CUSTOMER, WAREHOUSE & CHANNEL */}
                <div className="p-5 space-y-4 border-b border-slate-100 dark:border-white/5 shrink-0 bg-slate-50/50 dark:bg-[#13131e]">
                    
                    <div className="relative z-30">
                        <label className="text-[10px] font-black text-slate-500 dark:text-white/40 tracking-widest uppercase block mb-1.5 flex items-center gap-1.5"><Tag className="w-3.5 h-3.5"/> {isRTL ? 'قناة البيع (اختياري)' : 'Sales Channel'}</label>
                        <button onClick={() => setShowChannelSelect(!showChannelSelect)} className="w-full h-12 px-4 bg-white dark:bg-[#1a1a2e] rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-start truncate text-slate-800 dark:text-white/90 hover:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-2 truncate">
                                {activeTab?.salesChannelId ? (() => {
                                    const c = salesChannels.find(x => x.id === activeTab.salesChannelId);
                                    if (!c) return isRTL ? 'بدون قناة' : 'No Channel';
                                    return (
                                        <>
                                            {c.logo_url && <img src={c.logo_url} alt={c.name} className="w-6 h-6 rounded object-cover" />}
                                            <span className="truncate">{c.name} {c.pricing_method === 'percentage' ? `(+${c.markup_percentage}%)` : `(+${c.fixed_markup})`}</span>
                                        </>
                                    );
                                })() : (isRTL ? 'بدون قناة' : 'No Channel')}
                            </div>
                            <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${showChannelSelect ? '-rotate-90' : 'rotate-90'}`} />
                        </button>
                        
                        {showChannelSelect && (
                            <div className="absolute top-full mt-2 w-full bg-white dark:bg-[#1a1a28] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-2 animate-in fade-in slide-in-from-top-2 duration-200 max-h-60 overflow-y-auto z-50">
                                <button onClick={() => changeSalesChannel(undefined)} className="w-full p-3 text-start hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl text-xs font-bold mb-1 text-slate-700 dark:text-white transition-colors">
                                    {isRTL ? 'بدون قناة' : 'No Channel'}
                                </button>
                                {salesChannels.map(c => (
                                    <button key={c.id} onClick={() => changeSalesChannel(c.id)} className="w-full p-3 text-start hover:bg-blue-50 dark:hover:bg-blue-600/20 rounded-xl text-xs font-bold mb-1 text-slate-700 dark:text-white transition-colors flex items-center gap-3">
                                        {c.logo_url ? (
                                            <img src={c.logo_url} alt={c.name} className="w-7 h-7 rounded bg-white object-cover shadow-sm" />
                                        ) : (
                                            <div className="w-7 h-7 rounded bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center text-[10px] font-black">{c.name?.[0]||'?'}</div>
                                        )}
                                        <div className="flex flex-col">
                                            <span>{c.name}</span>
                                            <span className="text-[10px] text-slate-500">{c.pricing_method === 'percentage' ? `+${c.markup_percentage}%` : `+${c.fixed_markup}`}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="relative z-20">
                       <label className="text-[10px] font-black text-slate-500 dark:text-white/40 tracking-widest uppercase block mb-1.5 flex items-center gap-1.5"><User className="w-3.5 h-3.5"/> {isRTL ? 'العميل (اختياري)' : 'Customer'}</label>
                       <button onClick={()=>setShowCustomerSearch(!showCustomerSearch)} className="w-full h-12 px-4 bg-white dark:bg-[#1a1a2e] rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-start truncate text-slate-800 dark:text-white/90 hover:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm">
                           {activeTab?.customer?.name || (isRTL ? 'إختر عملية لربط الفاتورة...' : 'Select Customer...')}
                       </button>
                       {activeTab?.customer && customerVehicles.length > 0 && (
                            <select
                                className="w-full mt-2 h-10 px-3 text-xs font-bold rounded-xl border bg-white dark:bg-[#1a1a2e] border-slate-200 dark:border-white/10 text-slate-800 dark:text-white/90"
                                value={activeTab.selectedVehicleId || ''}
                                onChange={e => {
                                    const vId = e.target.value;
                                    updateTab('selectedVehicleId', vId);
                                    if (vId) {
                                        const v = customerVehicles.find(cv => cv.id === vId);
                                        if (v?.vehicle_year_id) setShowVehicleSearch(true);
                                    }
                                }}
                            >
                                <option value="">{isRTL ? '🚗 إختر سيارة العميل (اختياري)...' : '🚗 Select vehicle (Optional)...'}</option>
                                {customerVehicles.map(cv => (
                                    <option key={cv.id} value={cv.id}>{cv.display_name}</option>
                                ))}
                            </select>
                        )}
                       {showCustomerSearch && (
                           <div className="absolute top-full mt-2 w-full bg-white dark:bg-[#1a1a28] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-2 animate-in fade-in slide-in-from-top-2 duration-200">
                               {!isAddingCustomer ? (
                                   <>
                                       <input type="text" value={customerQuery} onChange={e=>setCustomerQuery(e.target.value)} className="w-full h-10 px-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-transparent rounded-xl text-xs font-bold outline-none mb-2 text-slate-800 dark:text-white focus:border-blue-500 focus:bg-white dark:focus:bg-white/10 transition-all" placeholder={isRTL ? "البحث بالاسم أو الهاتف..." : "Search name or phone..."} />
                                       <div className="max-h-48 overflow-y-auto no-scrollbar">
                                           {isSearchingCustomer ? (
                                               <div className="text-center py-4 text-xs font-bold text-slate-400 dark:text-white/40 flex items-center justify-center gap-2"><RefreshCw className="w-3 h-3 animate-spin"/> {isRTL ? 'جاري البحث...' : 'Searching...'}</div>
                                           ) : filteredCustomers.length === 0 ? (
                                               <div className="text-center py-4 text-xs font-bold text-slate-400 dark:text-white/40">{isRTL ? 'لا يوجد عملاء بهذا الاسم' : 'No customers found'}</div>
                                           ) : (
                                               filteredCustomers.map(c=>(<button key={c.id} onClick={()=>{updateTab('customer',c); setShowCustomerSearch(false);}} className="w-full p-3 text-start hover:bg-blue-50 dark:hover:bg-blue-600/20 rounded-xl text-xs font-bold mb-1 text-slate-700 dark:text-white transition-colors flex items-center gap-3"><div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center text-[10px] font-black">{c.name?.[0]||'?'}</div>{c.name}</button>))
                                           )}
                                       </div>
                                       <button onClick={() => setIsAddingCustomer(true)} className="w-full p-3 mt-1 text-blue-600 dark:text-blue-400 text-xs font-black bg-blue-50 dark:bg-blue-500/10 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors flex items-center justify-center gap-2 border border-blue-100 dark:border-transparent"><Plus className="w-4 h-4"/> {isRTL ? 'إضافة عميل جديد' : 'Add New Customer'}</button>
                                       {activeTab?.customer && <button onClick={()=>{updateTab('customer',null); setShowCustomerSearch(false);}} className="w-full p-3 mt-2 text-red-500 text-xs font-black bg-red-50 dark:bg-red-500/10 rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors uppercase tracking-widest border border-red-100 dark:border-transparent">{isRTL ? 'إلغاء التحديد' : 'Clear Customer'}</button>}
                                   </>
                               ) : (
                                   <div className="p-2 space-y-3">
                                       <h4 className="text-[11px] tracking-widest font-black text-slate-500 dark:text-white/50 uppercase px-1">{isRTL ? 'بيانات العميل الجديد' : 'New Customer Data'}</h4>
                                       <input type="text" value={newCustomer.name} onChange={e=>setNewCustomer(p=>({...p, name: e.target.value}))} className="w-full h-11 px-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold outline-none text-slate-800 dark:text-white focus:border-blue-500 transition-all" placeholder={isRTL ? "اسم العميل*" : "Customer Name*"} autoFocus />
                                       <input type="text" value={newCustomer.phone} onChange={e=>setNewCustomer(p=>({...p, phone: e.target.value}))} className="w-full h-11 px-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold outline-none text-slate-800 dark:text-white focus:border-blue-500 transition-all" placeholder={isRTL ? "رقم الجوال (اختياري)" : "Phone (Optional)"} />
                                       <div className="flex gap-2 pt-1">
                                           <button disabled={!newCustomer.name || isSavingCustomer} onClick={handleCreateCustomer} className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-colors flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-blue-600/30">
                                               {isSavingCustomer ? <RefreshCw className="w-4 h-4 animate-spin"/> : <><User className="w-4 h-4"/> {isRTL ? 'حفظ وإضافة للنظام' : 'Save & Select'}</>}
                                           </button>
                                           <button onClick={() => setIsAddingCustomer(false)} className="px-4 h-11 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-white/70 rounded-xl text-xs font-black transition-colors active:scale-95">{isRTL ? 'إلغاء' : 'Cancel'}</button>
                                       </div>
                                   </div>
                               )}
                           </div>
                       )}
                    </div>
                    <div className="relative">
                        <label className="text-[10px] font-black text-slate-500 dark:text-white/40 tracking-widest uppercase block mb-1.5 flex items-center gap-1.5"><Warehouse className="w-3.5 h-3.5"/> {isRTL ? 'المستودع للصرف' : 'Warehouse'}</label>
                        <select value={activeTab?.warehouseId || ''} onChange={e=>updateTab('warehouseId', e.target.value)} className="w-full h-12 px-4 bg-white dark:bg-[#1a1a2e] rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-white/90 outline-none cursor-pointer hover:border-blue-500 transition-colors shadow-sm appearance-none focus:ring-4 focus:ring-blue-500/10">
                            <option value="">{isRTL ? 'المستودع الرئيسي (الافتراضي)' : 'Main Warehouse'}</option>
                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                        <ChevronRight className="w-4 h-4 text-slate-400 dark:text-white/30 absolute top-[34px] left-4 pointer-events-none rotate-90" />
                    </div>
                </div>

                {/* CART ITEMS */}
                <div className="flex-1 overflow-y-auto no-scrollbar p-3 bg-slate-50/50 dark:bg-[#0a0a0f] relative">
                    {cart.map(item => (
                        <div key={item.id} className="p-3 mb-3 bg-white dark:bg-[#151522] border border-slate-200 dark:border-white/5 rounded-2xl flex gap-3 group hover:border-blue-300 dark:hover:border-blue-500/50 transition-all shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] dark:shadow-none">
                            <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                                <div className="flex items-center gap-1">
                                    <p className="text-[11px] font-black text-slate-800 dark:text-white line-clamp-2 leading-relaxed tracking-wide">{isRTL ? (item.product.name_ar||item.product.name) : item.product.name}</p>
                                </div>
                                {(() => {
                                    const ws = item.product.warehouse_stocks?.find((w: any) => w.warehouse_id === activeTab?.warehouseId) || item.product.warehouse_stocks?.[0];
                                    if (ws && ws.bin_location) {
                                        return (
                                            <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 font-bold">
                                                📍 {isRTL ? 'القطعة في:' : 'Bin Location:'} {ws.bin_location}
                                            </p>
                                        );
                                    }
                                    return null;
                                })()}
                                {item.note && <p className="text-[9px] text-slate-400 dark:text-white/40 mt-1 line-clamp-1 italic font-bold max-w-full"><span className="text-amber-500">Note:</span> {item.note}</p>}
                                {item.discount ? <p className="text-[9px] text-red-500 dark:text-red-400 font-bold mt-0.5 max-w-full">-{item.discount} {currencySymbol} Discount</p> : null}
                                
                                {item.product.has_core_charge && (
                                    <div className="flex items-center gap-2 mt-2 bg-slate-100 dark:bg-white/5 p-1.5 rounded-lg border border-slate-200 dark:border-white/10 w-fit" onClick={(e) => e.stopPropagation()}>
                                        <input type="checkbox" id={`core-${item.id}`} checked={item.coreReturned || false} onChange={e => {
                                            setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, cart: t.cart.map(i => i.id === item.id ? { ...i, coreReturned: e.target.checked } : i) } : t));
                                        }} className="w-3.5 h-3.5 text-blue-600 rounded" />
                                        <label htmlFor={`core-${item.id}`} className="text-[10px] font-bold text-slate-600 dark:text-white/70 whitespace-nowrap cursor-pointer">
                                            {isRTL ? 'تجاوز رسوم التالف (تم الإرجاع)' : 'Core Returned?'}
                                        </label>
                                        {!item.coreReturned && <span className="text-[10px] font-black text-red-500">+{parseFloat(item.product.core_charge_amount || 0).toFixed(2)} {currencySymbol}</span>}
                                    </div>
                                )}

                                <p className="text-[13px] text-blue-600 dark:text-blue-400 font-black mt-2 tabular-nums">{(item.price).toFixed(2)} <span className="text-[9px] font-bold text-slate-400 dark:text-white/30">{currencySymbol}</span></p>
                            </div>
                            <div className="flex flex-col gap-1 items-center justify-center">
                                <button onClick={(e)=>{e.stopPropagation(); setEditingItem(item); setEditItemSubState({ discount: item.discount||0, note: item.note||'' });}} className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg bg-slate-50 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 dark:text-white/50 transition-colors">
                                    <MoreHorizontal className="w-4 h-4"/>
                                </button>
                                <div className="w-10 flex flex-col items-center justify-between bg-slate-100 dark:bg-black/40 rounded-xl overflow-hidden py-1 border border-slate-200 dark:border-white/5 shadow-sm">
                                    <button onClick={()=>updateQty(item.id, 1)} className="w-full flex-1 flex items-center justify-center font-black text-xs text-slate-600 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 active:bg-slate-300 transition-colors"><Plus className="w-3.5 h-3.5"/></button>
                                    <span className="w-full font-black text-sm text-center text-slate-800 dark:text-white py-1">{item.quantity}</span>
                                    <button onClick={()=>updateQty(item.id, -1)} className="w-full flex-1 flex items-center justify-center font-black text-xs text-slate-600 dark:text-white hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-500/20 dark:hover:text-red-400 transition-colors"><Minus className="w-3.5 h-3.5"/></button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {cart.length === 0 && <div className="absolute inset-0 flex flex-col items-center justify-center opacity-40 dark:opacity-20 text-slate-500 dark:text-white"><ShoppingCart className="w-16 h-16 mb-4 stroke-[1]"/><p className="text-[14px] font-black uppercase tracking-widest">{isRTL ? 'السلة فارغة' : 'Cart Empty'}</p></div>}
                </div>

                {/* BOTTOM TOTALS */}
                <div className="p-6 bg-white dark:bg-[#11111b] border-t border-slate-200 dark:border-white/10 space-y-5 rounded-t-3xl shadow-[0_-20px_40px_-20px_rgba(0,0,0,0.1)] dark:shadow-[0_-20px_40px_-20px_rgba(0,0,0,0.3)] z-20 relative">
                    <div className="space-y-2 px-1">
                        <div className="flex justify-between text-[12px] font-black text-slate-500 dark:text-white/50 uppercase tracking-widest"><span>{isRTL ? 'المجموع' : 'Subtotal'}</span><span className="tabular-nums text-slate-800 dark:text-white/80">{itemsSubt.toFixed(2)}</span></div>
                        <div className="flex justify-between items-center text-[12px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                            <span>{isRTL ? 'خصم إضافي' : 'Additional Discount'}</span>
                            <div className="relative">
                                <input type="number" min="0" value={activeTab?.orderDiscount || ''} onChange={e=>updateTab('orderDiscount', parseFloat(e.target.value)||0)} className="w-20 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg text-right px-2 py-0.5 text-[12px] font-black text-emerald-700 dark:text-emerald-300 outline-none focus:border-emerald-400" placeholder="0.00" />
                            </div>
                        </div>
                        <div className="flex justify-between text-[12px] font-black text-slate-500 dark:text-white/50 uppercase tracking-widest"><span>{isRTL ? `الضريبة (${taxRate}%)` : `VAT (${taxRate}%)`}</span><span className="tabular-nums text-slate-800 dark:text-white/80">{vat.toFixed(2)}</span></div>
                    </div>
                    
                    <div className="h-24 bg-gradient-to-r from-blue-700 to-blue-600 dark:from-blue-600 dark:to-blue-500 rounded-[24px] flex items-center justify-between px-7 shadow-2xl shadow-blue-600/30 dark:shadow-blue-600/10 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-700" />
                        <div className="relative z-10 flex flex-col justify-center">
                            <p className="text-[10px] font-black text-blue-200/80 dark:text-blue-100/60 uppercase tracking-[0.2em] mb-1">{isRTL ? 'المبلغ الإجمالي' : 'Total Amount'}</p>
                            <p className="text-4xl font-black text-white tracking-tighter tabular-nums leading-none">{total.toFixed(2)}</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center relative z-10 border border-white/20">
                            <Receipt className="w-6 h-6 text-white" />
                        </div>
                    </div>
                    
                    <button disabled={!cart.length} onClick={()=>setShowPaymentModal(true)} className="w-full h-16 bg-emerald-500 dark:bg-emerald-600 disabled:bg-slate-200 dark:disabled:bg-white/5 rounded-2xl font-black text-base text-white disabled:text-slate-400 dark:disabled:text-white/30 uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 dark:shadow-none disabled:shadow-none active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                        <CreditCard className="w-5 h-5"/> {isRTL ? 'إتمام الدفع (F1)' : 'Pay (F1)'}
                    </button>
                </div>
            </div>

            {/* ──────────────────────────────────────────────────────────────
                2. MAIN CONTAINER (Grid & Cats)
            ────────────────────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0 relative">
                
                {/* GLOBAL HEADER */}
                <header className="h-20 border-b border-slate-200 dark:border-white/5 px-8 flex items-center justify-between bg-white dark:bg-[#111118] shrink-0 z-20">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20"><Zap className="w-6 h-6 text-white fill-white"/></div>
                        <div>
                            <h1 className="text-lg font-black text-slate-800 dark:text-white tracking-tight uppercase">Elite POS Pro</h1>
                            {isOnline ? (
                                <p className="text-[11px] text-blue-600 dark:text-blue-400 font-black tracking-[0.2em] flex items-center gap-1.5 mt-0.5 opacity-80"><span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]"/> {isRTL ? 'متصل بالإنترنت' : 'ONLINE TERMINAL'}</p>
                            ) : (
                                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-black tracking-[0.2em] flex items-center gap-1.5 mt-0.5"><span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]"/> {isRTL ? 'غير متصل - وضع عدم الاتصال' : 'OFFLINE MODE'}</p>
                            )}
                        </div>
                        {pendingSyncCount > 0 && (
                            <button
                                onClick={syncOfflineQueue}
                                disabled={!isOnline || isSyncingQueue}
                                className={clsx(
                                    'flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all',
                                    isOnline ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:hover:bg-amber-500/25' : 'bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-white/30 cursor-not-allowed'
                                )}
                                title={isRTL ? 'فواتير غير مُزامنة في انتظار الاتصال' : 'Invoices pending sync'}
                            >
                                <RefreshCw className={clsx('w-3.5 h-3.5', isSyncingQueue && 'animate-spin')} />
                                {isRTL ? `${pendingSyncCount} في الانتظار` : `${pendingSyncCount} pending`}
                            </button>
                        )}
                    </div>

                    {/* Price Levels (Dynamically Styled) */}
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/5 p-1.5 rounded-2xl border border-slate-200 dark:border-white/5">
                        {PRICE_LEVELS.map(p => (
                            <button key={p.id} onClick={()=>changePriceLevel(p.id)} className={clsx('h-10 px-6 rounded-xl text-[11px] font-black uppercase transition-all duration-300', activeTab?.priceLevel === p.id ? p.activeClass : 'text-slate-500 hover:text-slate-900 dark:text-white/50 dark:hover:text-white hover:bg-white dark:hover:bg-white/5')}>
                                {p.ar}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-4">
                        {currentShift && (
                            <button onClick={() => setShowCloseShiftModal(true)} className="h-10 px-4 rounded-xl text-[11px] font-black uppercase flex items-center gap-2 tracking-widest active:scale-95 transition-all bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-500/20">
                                <Lock className="w-3.5 h-3.5" /> {isRTL ? 'إغلاق الوردية' : 'End Shift'}
                            </button>
                        )}
                        <button onClick={toggleTheme} className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-amber-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors shadow-sm">{isDark?<Sun className="w-5 h-5"/>:<Moon className="w-5 h-5"/>}</button>
                    </div>
                </header>

                {/* SEARCH BAR */}
                <div className="h-16 border-b border-slate-200 dark:border-white/5 px-8 flex items-center gap-4 bg-slate-50/80 dark:bg-[#0d0d14] shrink-0 z-10 backdrop-blur-md">
                    <div className="flex-1 relative group w-full">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-white/30 group-focus-within:text-blue-500 transition-colors" />
                        <input ref={searchRef} type="text" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder={isRTL ? "البحث بالاسم أو مسح الباركود (F5)..." : "Search or scan barcode (F5)..."} className="w-full h-12 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl text-sm font-bold pl-14 pr-6 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-800 dark:text-white shadow-sm placeholder:text-slate-400 dark:placeholder:text-white/30" />
                    </div>
                    <button onClick={() => setShowVehicleSearch(true)} className="h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl flex items-center justify-center gap-2 font-bold transition-all shadow-lg shadow-blue-600/30 whitespace-nowrap active:scale-95">
                        <Car className="w-5 h-5" />
                        {isRTL ? 'بحث بالسيارة' : 'Search By Car'}
                    </button>
                </div>

                <div className="flex-1 flex min-h-0 overflow-hidden">
                    {/* CATEGORY SIDEBAR (Flex placed properly) */}
                    <div className="w-24 shrink-0 border-e border-slate-200 dark:border-white/5 overflow-y-auto no-scrollbar flex flex-col items-center py-6 gap-4 bg-white dark:bg-[#13131e]">
                        {categories.map(cat => (
                            <button key={cat} onClick={()=>setActiveCategory(cat)} className={clsx('w-16 min-h-[64px] rounded-[20px] flex flex-col items-center justify-center p-2 relative group transition-all duration-300', activeCategory===cat ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30 scale-110' : 'text-slate-500 hover:text-slate-900 bg-slate-50 dark:bg-white/5 dark:text-white/50 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95')}>
                                <Package className={clsx("w-5 h-5 mb-1.5 transition-transform duration-300", activeCategory===cat?"scale-110":"opacity-40 group-hover:scale-110")} />
                                <span className="text-[9px] font-black uppercase text-center line-clamp-2 w-full leading-tight">{cat === 'all' ? (isRTL?'الكل':'All') : cat.slice(0, 12)}</span>
                            </button>
                        ))}
                    </div>

                    {/* PRODUCT GRID */}
                    <PosProductGrid 
                        pagedProducts={pagedProducts} 
                        cartQtyMap={cartQtyMap} 
                        addToCart={addToCart} 
                        activePriceLevel={activeTab?.priceLevel || 'retail'} 
                        isRTL={isRTL} 
                        onShowAlternatives={setAlternativesProduct}
                    />
                </div>

                {/* FOOTER ACTIONS */}
                <div className="h-16 border-t border-slate-200 dark:border-white/10 px-8 flex items-center justify-between bg-white dark:bg-[#111118] shrink-0">
                    <div className="flex items-center gap-3">
                        <button disabled={currentPage<=1} onClick={()=>setCurrentPage(c=>c-1)} className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors disabled:opacity-30 disabled:hover:bg-slate-100 dark:disabled:hover:bg-white/5 active:scale-95"><ChevronRight className="w-5 h-5"/></button>
                        <div className="h-10 px-6 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center text-xs font-black text-slate-600 dark:text-white"><span className="text-blue-600 dark:text-blue-400">{currentPage}</span> <span className="mx-2 opacity-30">/</span> {totalPages}</div>
                        <button disabled={currentPage>=totalPages} onClick={()=>setCurrentPage(c=>c+1)} className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors disabled:opacity-30 disabled:hover:bg-slate-100 dark:disabled:hover:bg-white/5 active:scale-95"><ChevronLeft className="w-5 h-5"/></button>
                    </div>

                    <div className="hidden lg:flex items-center gap-8 text-slate-400 dark:text-white/40">
                        <div className="flex items-center gap-2.5"><span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-transparent text-[10px] font-black text-slate-600 dark:text-white shadow-sm">F1</span> <span className="text-[10px] font-black uppercase tracking-widest">{isRTL ? 'إتمام الدفع' : 'Pay'}</span></div>
                        <div className="flex items-center gap-2.5"><span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-transparent text-[10px] font-black text-slate-600 dark:text-white shadow-sm">F3</span> <span className="text-[10px] font-black uppercase tracking-widest">{isRTL ? 'عميل جديد' : 'New Tab'}</span></div>
                        <div className="flex items-center gap-2.5"><span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-transparent text-[10px] font-black text-slate-600 dark:text-white shadow-sm">F5</span> <span className="text-[10px] font-black uppercase tracking-widest">{isRTL ? 'البحث' : 'Search'}</span></div>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={()=>setShowReturnModal(true)} className="h-10 px-5 rounded-xl text-[11px] font-black uppercase flex items-center gap-2 tracking-widest active:scale-95 transition-all bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-500/20"><Search className="w-4 h-4"/> {isRTL ? 'إسترجاع بفاتورة' : 'Invoice Return'}</button>
                        <button onClick={()=>updateTab('isRefundMode', !activeTab?.isRefundMode)} className={clsx("h-10 px-5 rounded-xl text-[11px] font-black uppercase flex items-center gap-2 tracking-widest active:scale-95 transition-all", activeTab?.isRefundMode ? "bg-red-600 text-white shadow-lg shadow-red-600/30" : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/10")}><RefreshCw className="w-4 h-4"/> {isRTL ? 'إسترجاع سريع' : 'Quick Refund'}</button>
                        <button className="h-10 px-5 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-500/30 text-[11px] font-black uppercase flex items-center gap-2 tracking-widest active:scale-95 transition-all"><PauseCircle className="w-4 h-4"/> {isRTL ? 'تعليق الفاتورة' : 'Suspend'}</button>
                        <button onClick={()=>updateTab('cart',[])} className="h-10 px-5 rounded-xl bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-500/30 text-[11px] font-black uppercase flex items-center gap-2 tracking-widest active:scale-95 transition-all"><Trash2 className="w-4 h-4"/> {isRTL ? 'تفريغ السلة' : 'Clear Cart'}</button>
                    </div>
                </div>
            </div>

            {/* PAYMENT MODAL */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-2xl bg-white dark:bg-[#111118] border border-slate-200 dark:border-white/10 rounded-[32px] overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col md:flex-row">
                        <div className="flex-1 p-8 border-b md:border-b-0 md:border-s border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                            <div className="flex justify-between items-center mb-8">
                               <h2 className="text-2xl font-black uppercase tracking-tight text-slate-800 dark:text-white">{isRTL ? 'الدفع' : 'Payment'}</h2>
                               <button onClick={()=>setShowPaymentModal(false)} className="w-10 h-10 bg-slate-200 dark:bg-white/10 rounded-full flex items-center justify-center text-slate-500 dark:text-white/60 hover:text-slate-800 dark:hover:text-white transition-colors"><X className="w-5 h-5"/></button>
                            </div>
                            
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/40 mb-2">{isRTL ? 'المبلغ المطلوب دفعه' : 'Amount to pay'}</p>
                            <p className="text-6xl font-black text-slate-800 dark:text-white tabular-nums tracking-tighter mb-8 leading-none">{total.toFixed(2)} <span className="text-xl font-bold text-slate-400 dark:text-white/30">{currencySymbol}</span></p>
                            
                            <div className="space-y-3 w-full mb-8">
                                {['cash','card','other'].map(m=>(
                                    <button key={m} onClick={()=>setPaymentMethod(m as any)} className={clsx('w-full h-16 rounded-2xl border-2 flex items-center px-6 gap-4 transition-all', paymentMethod===m ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-600 dark:text-white/60 hover:border-blue-300 dark:hover:border-white/30 dark:hover:text-white')}>
                                        {m==='cash'?<Banknote className="w-6 h-6"/>:m==='card'?<CreditCard className="w-6 h-6"/>:<MoreHorizontal className="w-6 h-6"/>}
                                        <span className="text-sm font-black uppercase tracking-widest">{m === 'cash' ? (isRTL?'دفع نقدي كاش (Cash)':'Cash') : m === 'card' ? (isRTL?'شبكة بطاقة ائتمان':'Card') : (isRTL?'طرق أخرى':'Other')}</span>
                                    </button>
                                ))}
                            </div>
                            
                            <button onClick={handleCheckout} disabled={isSaving || (paymentMethod==='cash' && (parseFloat(receivedAmount)||0) < total)} className={clsx('w-full h-20 rounded-[24px] font-black text-xl uppercase tracking-[0.2em] transition-all active:scale-95 shadow-2xl disabled:shadow-none flex items-center justify-center gap-3', isSaving?'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-white/30':(paymentMethod==='cash' && (parseFloat(receivedAmount)||0) < total)?'bg-red-50 dark:bg-red-500/10 text-red-500 border border-red-200 dark:border-red-500/30':'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/30')}>
                                {isSaving ? <RefreshCw className="animate-spin h-8 w-8"/> : <>{isRTL ? 'تأكيد ودفع' : 'Confirm & Pay'} <ArrowRight className={clsx("w-6 h-6", isRTL ? "rotate-180" : "")}/></>}
                            </button>
                        </div>

                        {paymentMethod === 'cash' && (
                            <div className="w-[320px] p-8 flex flex-col bg-white dark:bg-[#111118]">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 dark:text-white/50 uppercase tracking-widest mb-1">{isRTL ? 'المبلغ المستلم' : 'Received Amount'}</p>
                                        <p className="text-4xl font-black text-blue-600 dark:text-blue-400 tabular-nums leading-none tracking-tighter">{receivedAmount || '0.00'}</p>
                                    </div>
                                    {receivedAmount && <button onClick={()=>setReceivedAmount('')} className="text-[10px] font-black text-red-500 px-3 py-1.5 bg-red-50 dark:bg-red-500/10 rounded-lg uppercase tracking-widest active:scale-95">{isRTL ? 'حذف' : 'Clear'}</button>}
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2 mb-6">
                                    <button onClick={() => setReceivedAmount(total.toFixed(2))} className="col-span-2 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-black hover:bg-emerald-500 active:scale-95 transition-all outline-none">المبلغ بالضبط (Exact)</button>
                                    {[50, 100, 200, 500].map(amt => (
                                        <button key={amt} onClick={() => setReceivedAmount(amt.toString())} className="h-10 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white text-[11px] font-black hover:bg-blue-50 dark:hover:bg-blue-600 hover:text-blue-600 dark:hover:text-white border-blue-200 dark:hover:border-blue-600 transition-all active:scale-95 outline-none">+{amt}</button>
                                    ))}
                                </div>

                                <div className="grid grid-cols-3 gap-2 mt-auto">
                                    {['7','8','9','4','5','6','1','2','3','C','0','.'].map(k=>(
                                        <button key={k} onClick={()=>handlePayNumPad(k)} className={clsx("h-14 rounded-2xl font-black text-xl active:scale-95 transition-all outline-none", k==='C' ? 'text-red-500 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20' : 'bg-slate-50 dark:bg-white/5 text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10')}>{k}</button>
                                    ))}
                                </div>
                                {(parseFloat(receivedAmount)||0) >= total && (
                                    <div className="mt-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 flex justify-between items-center animate-in zoom-in-95">
                                        <p className="text-[11px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest">{isRTL ? 'المتبقي' : 'Change'}</p>
                                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tighter">{(parseFloat(receivedAmount)-total).toFixed(2)}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showReturnModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-white dark:bg-[#111118] border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200 p-6 flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white">{isRTL ? 'إسترجاع فاتورة سابقة' : 'Return Invoice'}</h3>
                            <button onClick={()=>setShowReturnModal(false)} className="text-slate-400 hover:text-slate-700 dark:text-white/50 dark:hover:text-white"><X className="w-5 h-5"/></button>
                        </div>
                        <p className="text-xs font-bold text-slate-500 dark:text-white/50">{isRTL ? 'قم بمسح باركود الفاتورة أو أدخل الرقم المطبوع أعلى الفاتورة، مثال: INV-000001' : 'Scan barcode or enter invoice number e.g: INV-000001'}</p>
                        <input type="text" autoFocus value={returnSearchQuery} onChange={e=>setReturnSearchQuery(e.target.value)} onKeyDown={(e)=>{if(e.key==='Enter') fetchOriginalInvoice();}} placeholder={isRTL ? "رقم الفاتورة..." : "Invoice Number..."} className="w-full h-12 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 font-bold text-sm text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all uppercase" />
                        <button disabled={isSearchingReturn || !returnSearchQuery} onClick={fetchOriginalInvoice} className="w-full h-12 bg-blue-600 disabled:bg-slate-200 dark:disabled:bg-white/10 rounded-xl font-black text-white disabled:text-slate-500 flex items-center justify-center gap-2 active:scale-95 transition-all text-sm uppercase tracking-widest">
                            {isSearchingReturn ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Search className="w-4 h-4"/>}
                            {isRTL ? 'بحث واسترجاع' : 'Fetch & Return'}
                        </button>
                    </div>
                </div>
            )}

            {showSuccess && (
                <div className="fixed inset-0 z-[500] bg-white/95 dark:bg-[#050510]/95 backdrop-blur-xl flex flex-col items-center justify-center gap-8 animate-in fade-in duration-500">
                    <div className="w-40 h-40 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_80px_rgba(16,185,129,0.4)] animate-in zoom-in duration-500"><Check className="w-20 h-20 text-white stroke-[4]"/></div>
                    <div className="text-center">
                        <h2 className="text-5xl font-black text-slate-800 dark:text-white uppercase tracking-tighter mb-4">{isRTL ? 'تمت العملية بنجاح' : 'TRANSACTION SUCCESSFUL'}</h2>
                        <p className="text-emerald-600 dark:text-emerald-500 font-bold tracking-[0.5em] animate-pulse text-lg">{isRTL ? 'جاري الطباعة...' : 'PRINTING RECEIPT...'}</p>
                    </div>
                </div>
            )}

            {/* Vehicle Search Panel */}
            <VehicleSearchPanel
                isOpen={showVehicleSearch}
                onClose={() => setShowVehicleSearch(false)}
                onAddToCart={(product) => {
                    addToCart(product);
                    setShowVehicleSearch(false);
                }}
                warehouseId={activeTab?.warehouseId || null}
                locale={locale}
            />

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar{display:none;}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none;}
                .custom-scrollbar::-webkit-scrollbar{width:6px;height:6px;}
                .custom-scrollbar::-webkit-scrollbar-track{background:transparent;}
                .custom-scrollbar::-webkit-scrollbar-thumb{background:rgba(156,163,175,0.3);border-radius:10px;}
                .dark .custom-scrollbar::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);}
            `}</style>
        </div>
    );
}
