'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { salesApi, inventoryApi, crmApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface POSItem {
    id: number;
    product_id: number;
    code: string;
    name: string;
    unit: string;
    price: number;
    discountPercent: number;
    discountAmount: number;
    quantity: number;
}

interface POSInvoiceModalProps {
    dict: any;
    locale: string;
    onClose: () => void;
}

export default function POSInvoiceModal({ dict, locale, onClose }: POSInvoiceModalProps) {
    const isRTL = locale === 'ar';
    const s = dict.sales;
    const common = dict.common;

    // ── State ────────────────────────────────────────────────────────────────
    const [invoiceNum] = useState('INV-' + String(Math.floor(Math.random() * 900000) + 100000));
    const [invoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [warehouse, setWarehouse] = useState('main');
    const [priceType, setPriceType] = useState<'retail' | 'wholesale' | 'semi'>('retail');
    const [paymentType, setPaymentType] = useState<'cash' | 'credit' | 'visa'>('cash');
    const [taxMode, setTaxMode] = useState<'included' | 'excluded'>('included');
    const [items, setItems] = useState<POSItem[]>([]);
    const [paidAmount, setPaidAmount] = useState(0);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [notes, setNotes] = useState('');
    const [invoiceDiscount, setInvoiceDiscount] = useState(0);
    const [invoiceDiscMode, setInvoiceDiscMode] = useState<'amount' | 'percent'>('amount');
    const [showSavedToast, setShowSavedToast] = useState(false);
    const [saving, setSaving] = useState(false);

    // Dynamic Data
    const [products, setProducts] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [fetchingData, setFetchingData] = useState(true);

    // Customer autocomplete
    const [customerQuery, setCustomerQuery] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
    const [showCustDropdown, setShowCustDropdown] = useState(false);
    const custRef = useRef<HTMLDivElement>(null);

    // Product search
    const [codeInput, setCodeInput] = useState('');
    const [showProductDropdown, setShowProductDropdown] = useState(false);
    const productRef = useRef<HTMLDivElement>(null);

    // ── Data Fetching ────────────────────────────────────────────────────────
    useEffect(() => {
        const loadInitialData = async () => {
            setFetchingData(true);
            try {
                const [pRes, cRes] = await Promise.all([
                    inventoryApi.getProducts(),
                    crmApi.getCustomers()
                ]);
                setProducts(pRes.data?.data?.data || pRes.data?.data || []);
                setCustomers(cRes.data?.data?.data || cRes.data?.data || []);
            } catch (error) {

            }
            setFetchingData(false);
        };
        loadInitialData();
    }, []);

    // ── Customer filtered list ────────────────────────────────────────────────
    const filteredCustomers = useMemo(() => {
        if (!customerQuery.trim()) return [];
        const q = customerQuery.toLowerCase();
        return customers.filter(c =>
            c.name.toLowerCase().includes(q) ||
            (c.phone && c.phone.includes(customerQuery)) ||
            (c.code && c.code.toLowerCase().includes(q))
        );
    }, [customerQuery, customers]);

    // ── Product filtered list ─────────────────────────────────────────────────
    const filteredProducts = useMemo(() => {
        if (!codeInput.trim()) return [];
        const q = codeInput.toLowerCase();
        return products.filter(p =>
            p.code.toLowerCase().includes(q) ||
            p.name.toLowerCase().includes(q) ||
            (p.name_ar && p.name_ar.includes(codeInput))
        );
    }, [codeInput, products]);

    // ── Close dropdowns on outside click ─────────────────────────────────────
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (custRef.current && !custRef.current.contains(e.target as Node)) setShowCustDropdown(false);
            if (productRef.current && !productRef.current.contains(e.target as Node)) setShowProductDropdown(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // ── Keyboard shortcuts ────────────────────────────────────────────────────
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { onClose(); return; }
            if (e.ctrlKey && e.key === 's') { e.preventDefault(); handleSave(); return; }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [items, invoiceDiscount, selectedCustomer, paidAmount]);

    // ── Helpers ───────────────────────────────────────────────────────────────
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', { style: 'currency', currency: 'SAR', minimumFractionDigits: 0 }).format(val);

    const getPrice = (product: any) => {
        if (priceType === 'wholesale') return product.wholesale_price || product.price;
        if (priceType === 'semi') return product.semi_wholesale_price || product.price;
        return product.price || product.sell_price || 0;
    };

    // ── Customer selection ────────────────────────────────────────────────────
    const selectCustomer = (cust: any) => {
        setSelectedCustomer(cust);
        setCustomerQuery(cust.name);
        setPaymentType(cust.payment_type === 'credit' ? 'credit' : 'cash');
        setShowCustDropdown(false);
    };

    // ── Add item ──────────────────────────────────────────────────────────────
    const addProduct = (product: any) => {
        const existing = items.find(i => i.product_id === product.id);
        if (existing) {
            setItems(items.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
        } else {
            const price = getPrice(product);
            setItems([...items, {
                id: Date.now(),
                product_id: product.id,
                code: product.code,
                name: isRTL ? (product.name_ar || product.name) : product.name,
                unit: product.unit || 'pc',
                price,
                discountPercent: 0,
                discountAmount: 0,
                quantity: 1,
            }]);
        }
        setCodeInput('');
        setShowProductDropdown(false);
    };

    const addItemByCode = () => {
        const code = codeInput.trim().toUpperCase();
        const product = products.find(p => p.code === code);
        if (product) { addProduct(product); return; }
        setShowProductDropdown(true);
    };

    const handleCodeKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') addItemByCode();
        else setShowProductDropdown(true);
    };

    const updateItemField = (id: number, field: keyof POSItem, value: number | string) => {
        setItems(items.map(item => {
            if (item.id !== id) return item;
            const updated = { ...item, [field]: value };
            if (field === 'discountPercent') updated.discountAmount = +(updated.price * (updated.discountPercent / 100)).toFixed(2);
            if (field === 'discountAmount') updated.discountPercent = updated.price > 0 ? +((updated.discountAmount / updated.price) * 100).toFixed(2) : 0;
            return updated;
        }));
    };

    const removeItem = (id: number) => setItems(items.filter(i => i.id !== id));

    // ── Calculations ──────────────────────────────────────────────────────────
    const itemsSubtotal = useMemo(() =>
        items.reduce((sum, i) => sum + (i.price - i.discountAmount) * i.quantity, 0)
        , [items]);

    const invoiceDiscAmount = useMemo(() => {
        if (invoiceDiscMode === 'percent') return +(itemsSubtotal * (invoiceDiscount / 100)).toFixed(2);
        return Math.min(invoiceDiscount, itemsSubtotal);
    }, [invoiceDiscount, invoiceDiscMode, itemsSubtotal]);

    const subtotal = itemsSubtotal - invoiceDiscAmount;
    const taxRate = 0.15;
    const taxAmount = useMemo(() => {
        if (taxMode === 'included') return subtotal - (subtotal / (1 + taxRate));
        return subtotal * taxRate;
    }, [subtotal, taxMode]);

    const grandTotal = useMemo(() => {
        if (taxMode === 'included') return subtotal;
        return subtotal + taxAmount;
    }, [subtotal, taxAmount, taxMode]);

    const remaining = grandTotal - paidAmount;

    // ── Save actions ──────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (items.length === 0) return toast.error(isRTL ? "يرجى إضافة أصناف أولاً" : "Please add items first");
        
        setSaving(true);
        try {
            const payload = {
                invoice_number: invoiceNum,
                invoice_date: invoiceDate,
                customer_id: selectedCustomer?.id,
                warehouse_id: 1, // Default for now
                payment_method: paymentType,
                type: 'tax_invoice',
                status: 'confirmed',
                tax_mode: taxMode,
                notes: notes,
                total: grandTotal,
                paid_amount: paidAmount,
                discount_amount: invoiceDiscAmount,
                tax_amount: taxAmount,
                items: items.map(i => ({
                    product_id: i.product_id,
                    quantity: i.quantity,
                    unit_price: i.price,
                    discount_amount: i.discountAmount,
                    total_price: (i.price - i.discountAmount) * i.quantity
                }))
            };
            
            await salesApi.createInvoice(payload);
            setShowSavedToast(true);
            setTimeout(() => {
                setShowSavedToast(false);
                onClose();
            }, 2000);
        } catch (error: any) {

            if (error.response?.status === 428) {
                toast.success(isRTL ? 'تم حفظ الفاتورة كمسودة وتم إرسالها للمدير للموافقة.' : 'Invoice saved as draft and sent to manager for approval.');
                setShowSavedToast(true);
                setTimeout(() => {
                    setShowSavedToast(false);
                    onClose();
                }, 2000);
            } else {
                toast.error(error.response?.data?.message || (isRTL ? "فشل حفظ الفاتورة" : "Failed to save invoice"));
            }
        }
        setSaving(false);
    };

    const lblCls = "block text-[11px] font-medium text-surface-200/50 mb-1 uppercase tracking-wider";
    const selCls = "select-field text-sm py-2";

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-content !max-w-6xl !max-h-[94vh] flex flex-col">
                {/* ── SAVE TOAST ── */}
                {showSavedToast && (
                    <div className="fixed top-5 inset-x-0 flex justify-center z-[9999] animate-fade-in pointer-events-none">
                        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl bg-green-600 text-white text-sm font-semibold">
                            ✅ {isRTL ? `تم حفظ الفاتورة بنجاح` : `Invoice saved successfully`}
                        </div>
                    </div>
                )}

                {/* ── HEADER ── */}
                <div className="flex items-center justify-between p-4 border-b border-white/5 bg-gradient-to-r from-primary-500/5 to-transparent shrink-0">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{s.createInvoice}</h2>
                        <span className="badge badge-primary text-xs">{invoiceNum}</span>
                    </div>
                    <button onClick={onClose} className="btn-icon">✕</button>
                </div>

                {fetchingData ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-20">
                        <div className="animate-spin w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full mb-4"></div>
                        <p className="text-surface-400">{common.loading}</p>
                    </div>
                ) : (
                    <>
                        {/* ── SETTINGS BAR ── */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 border-b border-white/5 bg-surface-800/30 shrink-0">
                            <div>
                                <label className={lblCls}>{s.warehouse}</label>
                                <select className={selCls} value={warehouse} onChange={e => setWarehouse(e.target.value)}>
                                    <option value="main">{s.mainWarehouse}</option>
                                </select>
                            </div>
                            <div>
                                <label className={lblCls}>{s.priceType}</label>
                                <select className={selCls} value={priceType} onChange={e => setPriceType(e.target.value as any)}>
                                    <option value="retail">{s.retail}</option>
                                    <option value="wholesale">{s.wholesale}</option>
                                    <option value="semi">{s.semiWholesale}</option>
                                </select>
                            </div>
                            <div>
                                <label className={lblCls}>{s.paymentType}</label>
                                <select className={selCls} value={paymentType} onChange={e => setPaymentType(e.target.value as any)}>
                                    <option value="cash">{s.cash}</option>
                                    <option value="credit">{s.credit}</option>
                                    <option value="visa">{s.visa}</option>
                                </select>
                            </div>

                            {/* Customer Autocomplete */}
                            <div className="md:col-span-1 relative" ref={custRef}>
                                <label className={lblCls}>{s.customerName}</label>
                                <input
                                    type="text"
                                    className="input-field py-2 text-sm w-full"
                                    placeholder={isRTL ? 'ابحث باسم العميل...' : 'Search customer...'}
                                    value={customerQuery}
                                    onChange={e => { setCustomerQuery(e.target.value); setSelectedCustomer(null); setShowCustDropdown(true); }}
                                    onFocus={() => setShowCustDropdown(true)}
                                    autoComplete="off"
                                />
                                {showCustDropdown && filteredCustomers.length > 0 && (
                                    <div className="absolute top-full start-0 end-0 z-50 mt-1 rounded-xl border border-white/10 shadow-2xl overflow-hidden bg-surface-900">
                                        {filteredCustomers.map(c => (
                                            <button key={c.id} className="w-full text-start px-3 py-2.5 hover:bg-primary-500/10 transition-colors" onClick={() => selectCustomer(c)}>
                                                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                                                <p className="text-xs text-surface-400">{c.phone || c.code}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className={lblCls}>{s.taxEnabled}</label>
                                <select className={selCls} value={taxMode} onChange={e => setTaxMode(e.target.value as any)}>
                                    <option value="included">{s.taxIncluded}</option>
                                    <option value="excluded">{s.taxExcluded}</option>
                                </select>
                            </div>
                        </div>

                        {/* ── ADD ITEM BAR ── */}
                        <div className="flex items-center gap-3 p-4 border-b border-white/5 shrink-0" ref={productRef}>
                            <div className="relative flex-1 max-w-sm">
                                <input
                                    type="text"
                                    className="input-field py-2.5 text-sm w-full"
                                    placeholder={isRTL ? 'أضف صنف بالكود أو الاسم...' : 'Search item...'}
                                    value={codeInput}
                                    onChange={e => { setCodeInput(e.target.value); setShowProductDropdown(true); }}
                                    onKeyDown={handleCodeKeyDown}
                                    autoComplete="off"
                                />
                                {showProductDropdown && filteredProducts.length > 0 && (
                                    <div className="absolute top-full start-0 z-50 mt-1 w-full rounded-xl border border-white/10 shadow-2xl overflow-hidden bg-surface-900">
                                        {filteredProducts.map(p => (
                                            <button key={p.id} className="w-full text-start px-3 py-2.5 hover:bg-primary-500/10 transition-colors flex justify-between" onClick={() => addProduct(p)}>
                                                <div>
                                                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{isRTL ? (p.name_ar || p.name) : p.name}</p>
                                                    <p className="text-xs text-primary-400">{p.code}</p>
                                                </div>
                                                <span className="text-green-400 text-sm font-bold">{formatCurrency(getPrice(p))}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button onClick={addItemByCode} className="btn-primary py-2.5 px-6 text-sm">
                                {s.addItem}
                            </button>
                        </div>

                        {/* ── ITEMS TABLE ── */}
                        <div className="flex-1 overflow-auto p-4">
                            {items.length === 0 ? (
                                <div className="text-center py-20 opacity-30">
                                    <p className="text-lg">{isRTL ? 'لا توجد أصناف في الفاتورة' : 'No items in invoice'}</p>
                                </div>
                            ) : (
                                <table className="data-table text-sm">
                                    <thead>
                                        <tr>
                                            <th>{s.itemName}</th>
                                            <th className="w-24 text-center">{s.price}</th>
                                            <th className="w-20 text-center">{s.quantity}</th>
                                            <th className="w-20 text-center">{s.discountPercent}</th>
                                            <th className="w-28 text-end">{dict.common.total}</th>
                                            <th className="w-16"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item) => (
                                            <tr key={item.id}>
                                                <td className="font-medium" style={{ color: 'var(--text-primary)' }}>{item.name} <span className="text-xs text-surface-500 block">{item.code}</span></td>
                                                <td className="text-center">
                                                    <input type="number" className="bg-transparent w-20 text-center border-b border-white/10" value={item.price} onChange={e => updateItemField(item.id, 'price', +e.target.value)} />
                                                </td>
                                                <td className="text-center">
                                                    <input type="number" className="bg-transparent w-16 text-center border-b border-white/10 font-bold" value={item.quantity} min="1" onChange={e => updateItemField(item.id, 'quantity', +e.target.value)} />
                                                </td>
                                                <td className="text-center">
                                                    <input type="number" className="bg-transparent w-16 text-center border-b border-white/10 text-orange-400" value={item.discountPercent} min="0" max="100" onChange={e => updateItemField(item.id, 'discountPercent', +e.target.value)} />
                                                </td>
                                                <td className="text-end font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency((item.price - item.discountAmount) * item.quantity)}</td>
                                                <td className="text-center">
                                                    <button onClick={() => removeItem(item.id)} className="text-red-500/50 hover:text-red-500 font-bold">×</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* ── FOOTER ── */}
                        <div className="p-4 border-t border-white/5 bg-surface-800/40 grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className={lblCls}>{s.notes}</label>
                                <textarea rows={2} className="input-field text-sm w-full" value={notes} onChange={e => setNotes(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-surface-400">{s.subtotal}</span>
                                    <span style={{ color: 'var(--text-primary)' }}>{formatCurrency(itemsSubtotal)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-surface-400">{s.discount}</span>
                                    <span className="text-orange-400">-{formatCurrency(invoiceDiscAmount)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-surface-400">{s.vat}</span>
                                    <span style={{ color: 'var(--text-primary)' }}>{formatCurrency(taxAmount)}</span>
                                </div>
                                <div className="flex justify-between text-xl font-bold border-t border-white/10 pt-2">
                                    <span style={{ color: 'var(--text-primary)' }}>{common.total}</span>
                                    <span className="text-primary-400">{formatCurrency(grandTotal)}</span>
                                </div>
                            </div>
                            <div className="flex flex-col justify-end gap-3">
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <label className={lblCls}>{s.paidAmount}</label>
                                        <input type="number" className="input-field text-lg font-bold text-green-400 w-full" value={paidAmount} onChange={e => setPaidAmount(+e.target.value)} />
                                    </div>
                                    <div className="flex-1">
                                        <label className={lblCls}>{s.remaining}</label>
                                        <div className="text-lg font-bold mt-2" style={{ color: 'var(--text-primary)' }}>{formatCurrency(remaining)}</div>
                                    </div>
                                </div>
                                <button onClick={handleSave} disabled={saving} className="btn-primary w-full py-3 text-lg font-bold shadow-lg shadow-primary-500/20">
                                    {saving ? common.loading : (isRTL ? "إتمام الفاتورة" : "Complete Invoice")}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
