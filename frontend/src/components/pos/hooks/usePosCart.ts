import { useCallback, useMemo } from 'react';
import { PosSession } from './usePosState';
import toast from 'react-hot-toast';

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
            toast.error(`Product ${product?.name} is out of stock!`);
            return;
        }

        let productToAdd = product;
        
        // Auto-replace superseded part
        if (product.supersededBy) {
            toast.success(`Part number superseded! Added newer part: ${product.supersededBy.part_number}`, { icon: '🔄', duration: 4000 });
            // Map the superseded product structure to match the POS structure
            productToAdd = {
                ...product.supersededBy,
                price: parseFloat(product.supersededBy.sell_price || 0),
                stock_quantity: product.supersededBy.warehouseStocks?.reduce((acc: number, w: any) => acc + parseFloat(w.quantity), 0) || 0,
            };
        }

        const newCart = [...activeSession.cart];
        const existing = newCart.find((i) => i.product.id === productToAdd.id);
        if (existing) {
            existing.qty += 1;
            if (productToAdd.stock_quantity && existing.qty > productToAdd.stock_quantity) existing.qty = productToAdd.stock_quantity;
        } else {
            newCart.push({ product: productToAdd, qty: 1, discount: 0 });
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