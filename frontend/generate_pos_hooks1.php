<?php
$dir = __DIR__ . '/src/components/pos';
@mkdir("$dir/hooks", 0777, true);

$usePosState = <<<EOT
import { useState, useEffect, useCallback, useMemo } from 'react';
import { inventoryApi, crmApi, settingsApi } from '@/lib/api';

export interface CartItem {
    product: any;
    qty: number;
    discount: number;
}

export interface PosSession {
    id: string;
    title: string;
    cart: CartItem[];
    customerName: string;
    customerVat: string;
    invoiceType: 'simplified' | 'tax_invoice';
    paymentType: 'cash' | 'card' | 'split' | 'credit';
    cashPaid: string;
    cardPaid: string;
    invoiceDiscount: number;
    isHeld?: boolean;
    heldNote?: string;
}

const createEmptySession = (idx: number, isRTL: boolean): PosSession => ({
    id: `tab-\${Date.now()}-\${idx}`,
    title: `\${isRTL ? 'فاتورة' : 'Invoice'} \${idx}`,
    cart: [],
    customerName: '',
    customerVat: '',
    invoiceType: 'simplified',
    paymentType: 'cash',
    cashPaid: '',
    cardPaid: '',
    invoiceDiscount: 0,
});

export function usePosState(isRTL: boolean) {
    const [sessions, setSessions] = useState<PosSession[]>([createEmptySession(1, isRTL)]);
    const [activeIdx, setActiveIdx] = useState(0);
    const activeSession = sessions[activeIdx];

    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([{ key: 'all', ar: 'الكل', en: 'All' }]);
    const [allCustomers, setAllCustomers] = useState<any[]>([]);
    const [sellerInfo, setSellerInfo] = useState<any>(null);
    const [lastInvoiceNum, setLastInvoiceNum] = useState(1);

    // Filter states
    const [category, setCategory] = useState('all');
    const [search, setSearch] = useState('');

    useEffect(() => {
        const saved = localStorage.getItem('pos_sessions');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.length > 0) setSessions(parsed);
            } catch (e) {}
        }
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
            } catch (e) {}
        } catch (e) {}
    };

    const updateActiveSession = useCallback((updates: Partial<PosSession>) => {
        setSessions(prev => {
            const newSessions = [...prev];
            if (newSessions[activeIdx]) {
                newSessions[activeIdx] = { ...newSessions[activeIdx], ...updates };
            }
            return newSessions;
        });
    }, [activeIdx]);

    const handleNewTab = useCallback(() => {
        if (sessions.length >= 8) return alert(isRTL ? 'الحد الأقصى للتبويبات هو 8' : 'Maximum 8 tabs allowed');
        setSessions(prev => [...prev, createEmptySession(prev.length + 1, isRTL)]);
        setActiveIdx(sessions.length);
    }, [sessions.length, isRTL]);

    const handleCloseTab = useCallback((idx: number, e: any) => {
        e.stopPropagation();
        if (sessions.length === 1) {
            setSessions([createEmptySession(1, isRTL)]);
            setActiveIdx(0);
            return;
        }
        if (sessions[idx].cart.length > 0) {
            if (!confirm(isRTL ? 'الفاتورة تحتوي على أصناف، هل أنت متأكد من الإغلاق؟' : 'Cart is not empty, close anyway?')) return;
        }
        setSessions(prev => prev.filter((_, i) => i !== idx));
        setActiveIdx(prev => {
            const newTabsLength = sessions.length - 1;
            if (prev >= newTabsLength) return newTabsLength - 1;
            else if (prev > idx) return prev - 1;
            return prev;
        });
    }, [sessions, isRTL]);

    return {
        sessions, setSessions, activeIdx, setActiveIdx, activeSession, updateActiveSession,
        products, setProducts, categories, allCustomers, setAllCustomers, sellerInfo,
        lastInvoiceNum, setLastInvoiceNum, handleNewTab, handleCloseTab,
        category, setCategory, search, setSearch, createEmptySession
    };
}
EOT;
file_put_contents("$dir/hooks/usePosState.ts", $usePosState);

$usePosCart = <<<EOT
import { useCallback, useMemo } from 'react';
import { PosSession } from './usePosState';

export function usePosCart(
    activeSession: PosSession, 
    updateActiveSession: (updates: Partial<PosSession>) => void
) {
    const cartSubtotalExcl = useMemo(() => {
        if (!activeSession) return 0;
        return activeSession.cart.reduce((sum, item) => {
            const linePrice = item.qty * item.product.price;
            const disc = linePrice * (item.discount / 100);
            return sum + (linePrice - disc);
        }, 0);
    }, [activeSession]);
    
    const discountedExcl = Math.max(0, cartSubtotalExcl - (activeSession?.invoiceDiscount || 0));
    const cartVat = discountedExcl * 0.15;
    const cartTotal = discountedExcl + cartVat;

    const totalPaidCNum = parseFloat(activeSession?.cashPaid || '0') || 0;
    const totalPaidCardNum = parseFloat(activeSession?.cardPaid || '0') || 0;
    const change = Math.max(0, (totalPaidCNum + totalPaidCardNum) - cartTotal);

    const addToCart = useCallback((product: any) => {
        if (!product || (product.stock_quantity !== undefined && product.stock_quantity <= 0)) {
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
        if (typeof Audio !== 'undefined') new Audio('/beep.mp3').play().catch(()=>{});
    }, [activeSession, updateActiveSession]);

    const updateQty = useCallback((id: number, qty: number) => {
        if (qty <= 0) { 
            updateActiveSession({ cart: activeSession.cart.filter((i) => i.product.id !== id) });
            return; 
        }
        const newCart = activeSession.cart.map((i) => i.product.id === id ? { ...i, qty: (i.product.stock_quantity ? Math.min(qty, i.product.stock_quantity) : qty) } : i);
        updateActiveSession({ cart: newCart });
    }, [activeSession, updateActiveSession]);

    const removeFromCart = useCallback((id: number) => {
        updateActiveSession({ cart: activeSession.cart.filter((i) => i.product.id !== id) });
    }, [activeSession, updateActiveSession]);

    const clearCart = useCallback(() => {
        updateActiveSession({ cart: [], customerName: '', customerVat: '', cashPaid: '', cardPaid: '', invoiceDiscount: 0 });
    }, [updateActiveSession]);

    return {
        cartSubtotalExcl, discountedExcl, cartVat, cartTotal, totalPaidCNum, totalPaidCardNum, change,
        addToCart, updateQty, removeFromCart, clearCart
    };
}
EOT;
file_put_contents("$dir/hooks/usePosCart.ts", $usePosCart);
echo "Created usePosState and usePosCart";
?>
