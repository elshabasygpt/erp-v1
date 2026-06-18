import { useCallback, useState } from 'react';
import { PosSession } from './usePosState';
import toast from 'react-hot-toast';

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
    setShowPrint: any,
    allCustomers: any[],
    warehouses: any[]
) {
    const [successMsg, setSuccessMsg] = useState('');

    const generatePayload = useCallback(() => {
        const uuid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `offline-${Date.now()}`;
        return {
            id: `INV-2024-${String(lastInvoiceNum).padStart(4, '0')}`,
            uuid,
            customer_id: activeSession.customerName ? allCustomers?.find(c => c.name === activeSession.customerName)?.id : undefined,
            warehouse_id: warehouses?.[0]?.id, // Require the first warehouse for now
            type: activeSession.paymentType === 'credit' ? 'credit' : 'cash',
            status: 'confirmed',
            due_date: new Date().toISOString().slice(0, 10),
            items: activeSession.cart.map((i) => ({
                product_id: i.product.id,
                quantity: i.qty,
                unit_price: i.product.price,
                vat_rate: 15,
                discount_percent: i.discount,
            })),
            paid_amount: cartTotal, // Fully paid if cash
            payment_method: activeSession.paymentType === 'card' ? 'visa' : activeSession.paymentType,
            sales_channel_id: undefined, // Optional
            internal_notes: `POS Invoice. Total: ${cartTotal}, Change: ${change}`,
        };
    }, [activeSession, cartTotal, change, lastInvoiceNum, sellerInfo, isRTL, allCustomers, warehouses]);

    const handleCompletePurchase = useCallback(async (print: boolean) => {
        if ((activeSession.paymentType === 'cash' || activeSession.paymentType === 'split') && (totalPaidCNum + totalPaidCardNum) < cartTotal) {
            toast.error(isRTL ? 'المبلغ المدفوع أقل من الإجمالي!' : 'Paid amount is less than total!');
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