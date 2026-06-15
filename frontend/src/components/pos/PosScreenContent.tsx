'use client';

import React, { useState, useRef } from 'react';
import InvoicePrintTemplate from '@/components/sales/InvoicePrintTemplate';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { inventoryApi } from '@/lib/api';

import { usePosState } from './hooks/usePosState';
import { usePosCart } from './hooks/usePosCart';
import { usePosProducts } from './hooks/usePosProducts';
import { usePosPayment } from './hooks/usePosPayment';

import PosTabs from './PosTabs';
import BasicPosProductGrid from './BasicPosProductGrid';
import PosCartSidebar from './PosCartSidebar';
import PosPaymentModal from './PosPaymentModal';

export default function PosScreenContent({ dict, locale }: { dict: any; locale: string }) {
    const isRTL = locale === 'ar';
    const { isOnline, pendingCount, isSyncing, handleSaveInvoice, syncPendingInvoices } = useOfflineSync();

    const {
        sessions, setSessions, activeIdx, setActiveIdx, activeSession, updateActiveSession,
        products, setProducts, categories, allCustomers, setAllCustomers, sellerInfo,
        lastInvoiceNum, setLastInvoiceNum, handleNewTab, handleCloseTab,
        category, setCategory, search, setSearch, createEmptySession
    } = usePosState(isRTL);

    const {
        cartSubtotalExcl, discountedExcl, cartVat, cartTotal, totalPaidCNum, totalPaidCardNum, change,
        addToCart, updateQty, removeFromCart, clearCart
    } = usePosCart(activeSession, updateActiveSession);

    const { filteredProducts } = usePosProducts(products, category, search);

    const [isFullscreen, setIsFullscreen] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [showPayment, setShowPayment] = useState(false);
    const [showPrint, setShowPrint] = useState(false);
    const [printInvoiceData, setPrintInvoiceData] = useState<any>(null);
    const [showHoldModal, setShowHoldModal] = useState(false);
    const [holdNote, setHoldNote] = useState('');
    const [showRecallList, setShowRecallList] = useState(false);

    const { successMsg, setSuccessMsg, handleCompletePurchase } = usePosPayment(
        activeSession, sessions, setSessions, setActiveIdx, activeIdx, createEmptySession,
        cartTotal, change, totalPaidCNum, totalPaidCardNum, sellerInfo, isRTL,
        lastInvoiceNum, setLastInvoiceNum, handleSaveInvoice, setShowPayment,
        setPrintInvoiceData, setShowPrint
    );

    useBarcodeScanner((barcode) => {
        const localProd = products.find(p => p.barcode === barcode || p.code === barcode);
        if (localProd) {
            addToCart(localProd);
            setSearch('');
            return;
        }
        inventoryApi.scanBarcode(barcode).then(res => {
            if (res.data?.data) {
                setProducts(prev => [...prev, res.data.data]);
                addToCart(res.data.data);
                setSearch('');
            }
        }).catch(() => {
            alert(isRTL ? `منتج برمز ${barcode} غير موجود` : `Product with barcode ${barcode} not found`);
        });
    }, true);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
    };

    const shortcutMap: any = {
        'F1': () => handleNewTab(),
        'F2': () => searchInputRef.current?.focus(),
        'F3': () => document.getElementById('customer-search-input')?.focus(),
        'F4': () => document.getElementById('invoice-discount-input')?.focus(),
        'F8': () => { if (activeSession?.cart.length > 0) setShowPayment(true); },
        'F9': () => toggleFullscreen(),
        'F10': () => { if (activeSession?.cart.length > 0) setShowHoldModal(true); },
        'Delete': () => clearCart(),
        'Escape': () => {
            setShowPayment(false);
            setShowPrint(false);
            setShowHoldModal(false);
            setShowRecallList(false);
        },
    };

    for (let i = 1; i <= 8; i++) {
        shortcutMap[`Alt+${i}`] = () => { if (sessions[i - 1]) setActiveIdx(i - 1); };
    }

    useKeyboardShortcuts(shortcutMap, true);

    const holdCurrentInvoice = () => {
        if (activeSession.cart.length === 0) return;
        updateActiveSession({ isHeld: true, heldNote: holdNote || new Date().toLocaleTimeString() });
        setHoldNote('');
        setShowHoldModal(false);
        setSuccessMsg(isRTL ? '✅ معلقة' : '✅ Held');
        setTimeout(() => setSuccessMsg(''), 3000);
        handleNewTab();
    };

    if (!activeSession) return null;

    return (
        <div className={`flex flex-col md:flex-row h-screen -m-8 overflow-hidden bg-surface-100 dark:bg-surface-950 animate-fade-in ${isFullscreen ? 'z-50 fixed inset-0 m-0' : 'h-[calc(100vh-4rem)]'}`}>
            <div className="flex flex-col flex-1 overflow-hidden h-full border-e border-default/50 relative">
                <PosTabs 
                    sessions={sessions} activeIdx={activeIdx} setActiveIdx={setActiveIdx}
                    handleCloseTab={handleCloseTab} handleNewTab={handleNewTab}
                    isOnline={isOnline} pendingCount={pendingCount} isSyncing={isSyncing}
                    syncPendingInvoices={syncPendingInvoices} toggleFullscreen={toggleFullscreen} isRTL={isRTL}
                />

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
                    <button onClick={() => setShowRecallList(true)} title="F6 Recall" className="px-4 bg-orange-100 text-orange-700 font-bold rounded-xl text-sm flex items-center hover:bg-orange-200 transition">
                        📃 <span className="hidden md:inline ms-2">{isRTL ? 'استدعاء (F6)' : 'Recall (F6)'}</span>
                    </button>
                </div>

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

                <BasicPosProductGrid 
                    isRTL={isRTL} successMsg={successMsg} filteredProducts={filteredProducts}
                    activeSession={activeSession} addToCart={addToCart}
                />
            </div>

            <PosCartSidebar 
                isRTL={isRTL} activeSession={activeSession} updateActiveSession={updateActiveSession}
                allCustomers={allCustomers} setAllCustomers={setAllCustomers}
                clearCart={clearCart} removeFromCart={removeFromCart} updateQty={updateQty}
                cartSubtotalExcl={cartSubtotalExcl} discountedExcl={discountedExcl} cartVat={cartVat}
                cartTotal={cartTotal} setShowHoldModal={setShowHoldModal} setShowPayment={setShowPayment}
            />

            {showPayment && (
                <PosPaymentModal 
                    isRTL={isRTL} activeSession={activeSession} updateActiveSession={updateActiveSession}
                    cartTotal={cartTotal} change={change} totalPaidCNum={totalPaidCNum} totalPaidCardNum={totalPaidCardNum}
                    setShowPayment={setShowPayment} handleCompletePurchase={handleCompletePurchase}
                />
            )}

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

            {showRecallList && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-surface-900 w-full max-w-2xl rounded-2xl shadow-2xl p-6 animate-scale-in">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold flex items-center gap-2">📃 {isRTL ? 'الفواتير المعلقة والنشطة' : 'Active & Held Invoices'}</h2>
                            <button onClick={()=>setShowRecallList(false)} className="text-surface-400 hover:text-red-500 font-bold">✕ إغلاق</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto p-1">
                            {sessions.map((sess: any, idx: number) => (
                                <div key={sess.id} onClick={() => { setActiveIdx(idx); setShowRecallList(false); }} className={`p-4 rounded-xl border-2 cursor-pointer transition flex flex-col gap-2 ${activeIdx === idx ? 'border-primary-500 bg-primary-50/50' : 'border-surface-200 hover:border-primary-300'}`}>
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-sm text-surface-800 dark:text-surface-200">
                                            {sess.isHeld && <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-[10px] me-2">معلقة</span>}
                                            {sess.title}
                                        </h3>
                                        <span className="text-xs font-black text-primary-600">{
                                            ((sess.cart.reduce((s:any,i:any) => s + (i.qty * i.product.price * (1 - i.discount/100)), 0) - sess.invoiceDiscount) * 1.15).toFixed(2)
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

            {showPrint && printInvoiceData && (
                <InvoicePrintTemplate invoice={printInvoiceData} locale={locale} onClose={() => { setShowPrint(false); }} />
            )}

            <div className="fixed bottom-2 end-2 flex gap-1 z-50 pointer-events-none opacity-40 hover:opacity-100 transition scale-75 origin-bottom-right">
                <kbd className="bg-black/80 text-white px-2 py-1 rounded text-xs">F1: New</kbd>
                <kbd className="bg-black/80 text-white px-2 py-1 rounded text-xs">F2: Search</kbd>
                <kbd className="bg-black/80 text-white px-2 py-1 rounded text-xs">F6: Recall</kbd>
                <kbd className="bg-black/80 text-white px-2 py-1 rounded text-xs">F8: Pay</kbd>
            </div>
            
        </div>
    );
}