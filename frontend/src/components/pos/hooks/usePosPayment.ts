import { useCallback, useState } from 'react';
import { PosSession } from './usePosState';

export function usePosPayment(
    activeSession: PosSession,
    sessions: PosSession[],
    setSessions: any,
    setActiveIdx: any,
    activeIdx: number,
    createEmptySession: any,
    cartTotal: number,
    change: number,
    totalPaidCNum: number,
    totalPaidCardNum: number,
    sellerInfo: any,
    isRTL: boolean,
    lastInvoiceNum: number,
    setLastInvoiceNum: any,
    handleSaveInvoice: any,
    setShowPayment: any,
    setPrintInvoiceData: any,
    setShowPrint: any
) {
    const [successMsg, setSuccessMsg] = useState('');

    const generatePayload = useCallback(() => {
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
                name: isRTL ? (i.product.nameAr || i.product.name) : i.product.name,
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
    }, [activeSession, cartTotal, change, lastInvoiceNum, sellerInfo, isRTL]);

    const handleCompletePurchase = useCallback(async (print: boolean) => {
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
        
        setLastInvoiceNum((n: number) => n + 1);
        
        const newSessions = sessions.filter((_, i) => i !== activeIdx);
        if (newSessions.length === 0) setSessions([createEmptySession(1, isRTL)]);
        else setSessions(newSessions);
        setActiveIdx(0);
    }, [activeSession, totalPaidCNum, totalPaidCardNum, cartTotal, generatePayload, handleSaveInvoice, setShowPayment, setPrintInvoiceData, setShowPrint, setLastInvoiceNum, sessions, activeIdx, setSessions, createEmptySession, isRTL, setActiveIdx]);

    return {
        successMsg, setSuccessMsg, handleCompletePurchase
    };
}