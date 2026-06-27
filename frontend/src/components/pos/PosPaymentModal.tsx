import React, { memo, useId } from 'react';

interface PosPaymentModalProps {
    isRTL: boolean;
    activeSession: any;
    updateActiveSession: (updates: any) => void;
    cartTotal: number;
    change: number;
    totalPaidCNum: number;
    totalPaidCardNum: number;
    setShowPayment: (v: boolean) => void;
    handleCompletePurchase: (print: boolean) => void;
}

const PosPaymentModal = memo(function PosPaymentModal({
    isRTL, activeSession, updateActiveSession, cartTotal, change, totalPaidCNum, totalPaidCardNum,
    setShowPayment, handleCompletePurchase
}: PosPaymentModalProps) {
    const titleId = useId();
    const cashLabelId = useId();
    const cardLabelId = useId();

    const cashVal = parseFloat(activeSession.cashPaid || '0');
    const cardVal = parseFloat(activeSession.cardPaid || '0');
    const isPaymentValid = activeSession.paymentType === 'cash'
        ? cashVal >= 0
        : activeSession.paymentType === 'card'
            ? cardVal >= 0
            : cashVal >= 0 && cardVal >= 0;

    const handleCashChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        if (raw === '' || parseFloat(raw) >= 0 || raw === '-') {
            if (raw !== '-') updateActiveSession({ cashPaid: raw });
        }
    };

    const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        if (raw === '' || parseFloat(raw) >= 0 || raw === '-') {
            if (raw !== '-') updateActiveSession({ cardPaid: raw });
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            dir={isRTL ? 'rtl' : 'ltr'}
        >
            <div className="bg-white dark:bg-surface-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-scale-in flex flex-col md:flex-row">
                
                <div className="p-6 bg-surface-50 dark:bg-surface-950 md:w-2/5 border-e border-dashed flex flex-col justify-center text-center">
                    <h2 id={titleId} className="sr-only">{isRTL ? 'نافذة الدفع' : 'Payment Window'}</h2>
                    <p className="text-sm font-bold text-surface-500 uppercase tracking-widest">{isRTL ? 'المبلغ المطلوب' : 'Amount Due'}</p>
                    <p className="text-5xl font-black text-indigo-600 dark:text-indigo-400 my-4">{cartTotal.toFixed(2)}</p>
                    <p className="text-xs font-medium text-surface-400 mb-6 px-4 py-2 border rounded-full bg-white dark:bg-surface-800 self-center">
                        {activeSession.cart.reduce((a:any,c:any)=>a+c.qty,0)} Items
                    </p>
                    
                    {(activeSession.paymentType === 'cash' || activeSession.paymentType === 'split') && (
                        <div className="mt-auto p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 rounded-xl relative overflow-hidden">
                            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 opacity-80">{isRTL ? 'الباقي للعميل (الصرف)' : 'Change Return'}</p>
                            <p className="text-3xl font-black text-emerald-600 mt-1">{change.toFixed(2)} <span className="text-sm">SAR</span></p>
                        </div>
                    )}
                </div>

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
                                <label id={cashLabelId} className="text-xs font-bold text-surface-500 ms-1 mb-1 block">
                                    💵 {isRTL ? 'الكاش المستلم' : 'Cash Received'}
                                </label>
                                <input
                                    type="number"
                                    autoFocus
                                    min="0"
                                    step="0.01"
                                    aria-labelledby={cashLabelId}
                                    aria-describedby={cashVal < 0 ? `cash-error` : undefined}
                                    value={activeSession.cashPaid}
                                    onChange={handleCashChange}
                                    className="w-full text-2xl font-black p-3 rounded-xl border-2 border-surface-200 focus:border-primary-500 bg-surface-50 focus:bg-white text-center tracking-wider outline-none"
                                    placeholder="0.00"
                                />
                                {cashVal < 0 && (
                                    <p id="cash-error" role="alert" className="text-xs text-red-500 mt-1 text-center">
                                        {isRTL ? 'المبلغ يجب أن يكون أكبر من أو يساوي صفر' : 'Amount must be ≥ 0'}
                                    </p>
                                )}
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
                                <label id={cardLabelId} className="text-xs font-bold text-surface-500 ms-1 mb-1 block">
                                    💳 {isRTL ? 'الشبكة المسحوبة' : 'Card Amount'}
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    aria-labelledby={cardLabelId}
                                    value={activeSession.cardPaid}
                                    onChange={handleCardChange}
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
                        <button
                            onClick={() => setShowPayment(false)}
                            className="py-3 bg-surface-100 hover:bg-surface-200 text-surface-700 font-bold rounded-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-400"
                        >
                            {isRTL ? 'إلغاء (Esc)' : 'Cancel (Esc)'}
                        </button>
                        <button
                            onClick={() => handleCompletePurchase(true)}
                            disabled={!isPaymentValid}
                            aria-disabled={!isPaymentValid}
                            className="py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 transition flex items-center justify-center gap-2 group relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                            title="F10"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                            <span className="relative z-10 font-black">🖨️ {isRTL ? 'دفع وطباعة (F10)' : 'Pay & Print (F10)'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default PosPaymentModal;