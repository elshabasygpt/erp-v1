import React, { memo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePosCustomer } from './hooks/usePosCustomer';
import { useRegionalSettings } from '@/providers/RegionalSettingsProvider';

interface PosCartSidebarProps {
    isRTL: boolean;
    activeSession: any;
    updateActiveSession: (updates: any) => void;
    allCustomers: any[];
    clearCart: () => void;
    removeFromCart: (id: number) => void;
    updateQty: (id: number, qty: number) => void;
    cartSubtotalExcl: number;
    discountedExcl: number;
    cartVat: number;
    cartTotal: number;
    setShowHoldModal: (v: boolean) => void;
    setShowPayment: (v: boolean) => void;
}

const PosCartSidebar = memo(function PosCartSidebar({
    isRTL, activeSession, updateActiveSession, allCustomers,
    clearCart, removeFromCart, updateQty, cartSubtotalExcl, discountedExcl, cartVat, cartTotal,
    setShowHoldModal, setShowPayment
}: PosCartSidebarProps) {
    const [showCustomerResults, setShowCustomerResults] = useState(false);
    const [showQuickAddCustomer, setShowQuickAddCustomer] = useState(false);
    const [quickAddName, setQuickAddName] = useState('');
    const [quickAddPhone, setQuickAddPhone] = useState('');
    const { createCustomer, loading: customerLoading } = usePosCustomer();
    const { taxRate, currencySymbol } = useRegionalSettings();
    const queryClient = useQueryClient();

    return (
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
                                            const newCust = await createCustomer({ name: quickAddName, name_ar: quickAddName, phone: quickAddPhone, group: 'retail', payment_type: 'cash' });
                                            if (newCust) {
                                                updateActiveSession({ customerName: quickAddName });
                                                queryClient.invalidateQueries({ queryKey: ['pos-customers'] });
                                            }
                                        } catch {
                                            updateActiveSession({ customerName: quickAddName });
                                        }
                                        setShowQuickAddCustomer(false);
                                        setQuickAddName('');
                                        setQuickAddPhone('');
                                    }}
                                    disabled={customerLoading}
                                    className="flex-1 btn-primary text-xs py-1.5 disabled:opacity-50"
                                >
                                    {customerLoading ? '...' : (isRTL ? 'حفظ واختيار' : 'Save & Select')}
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
                <div className="px-4 pb-2 mt-2">
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
                    activeSession.cart.map((item: any) => {
                        const lineExcl = item.qty * item.product.price * (1 - item.discount / 100);
                        const lineVat = lineExcl * (taxRate / 100);
                        const lineTotal = lineExcl + lineVat;
                        return (
                            <div key={item.product.id} className="bg-white dark:bg-surface-900 border rounded-xl p-3 shadow-sm flex flex-col gap-2 relative group">
                                <div className="flex justify-between items-start">
                                    <div className="pe-6">
                                        <p className="text-xs font-bold line-clamp-1">{isRTL ? (item.product.nameAr || item.product.name) : item.product.name}</p>
                                        <p className="text-[10px] text-primary-600 font-bold mt-0.5">
                                            {parseFloat(item.product.price).toLocaleString()} ر.س
                                            {item.product.warehouseStocks?.[0]?.bin_location && (
                                                <span className="ml-2 text-gray-500 bg-gray-100 px-1 rounded">
                                                    {isRTL ? 'الرف:' : 'Bin:'} {item.product.warehouseStocks[0].bin_location}
                                                </span>
                                            )}
                                        </p>
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
                        <span>{isRTL ? `+ ضريبة القيمة المضافة (${taxRate}%)` : `+ VAT (${taxRate}%)`}</span>
                        <span className="font-mono">{cartVat.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-end pt-2 border-t font-black">
                        <span className="text-sm">{isRTL ? 'الإجمالي المطلوب' : 'Total Due'}</span>
                        <span className="text-3xl text-indigo-600 dark:text-indigo-400 tracking-tight">{cartTotal.toFixed(2)} <span className="text-xs">{currencySymbol}</span></span>
                    </div>
                </div>

                <div className="p-3 bg-surface-50 dark:bg-surface-800 grid grid-cols-4 gap-2">
                    <button onClick={() => setShowHoldModal(true)} disabled={activeSession.cart.length===0} className="col-span-1 py-2 text-xs font-bold text-orange-600 bg-orange-100 hover:bg-orange-200 rounded-lg flex flex-col items-center justify-center gap-1 disabled:opacity-50 transition" title="F10">
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
    );
});

export default PosCartSidebar;