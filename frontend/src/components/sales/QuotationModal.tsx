'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { salesApi, inventoryApi, crmApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface POSItem {
    id: number;
    product_id: number;
    code: string;
    name: string;
    unit: string;
    price: number;
    quantity: number;
}

interface QuotationModalProps {
    dict: any;
    locale: string;
    onClose: () => void;
}

export default function QuotationModal({ dict, locale, onClose }: QuotationModalProps) {
    const isRTL = locale === 'ar';
    const s = dict.sales;
    const common = dict.common;

    const [quotationNum] = useState('QTN-' + String(Math.floor(Math.random() * 900000) + 100000));
    const [issueDate] = useState(new Date().toISOString().split('T')[0]);
    const [validUntil, setValidUntil] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d.toISOString().split('T')[0];
    });
    const [items, setItems] = useState<POSItem[]>([]);
    const [saving, setSaving] = useState(false);
    const [notes, setNotes] = useState('');

    const [products, setProducts] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [fetchingData, setFetchingData] = useState(true);

    const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
    const [customerQuery, setCustomerQuery] = useState('');
    const [showCustDropdown, setShowCustDropdown] = useState(false);
    const custRef = useRef<HTMLDivElement>(null);

    const [codeInput, setCodeInput] = useState('');
    const [showProductDropdown, setShowProductDropdown] = useState(false);
    const productRef = useRef<HTMLDivElement>(null);

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

    const filteredCustomers = useMemo(() => {
        if (!customerQuery.trim()) return [];
        const q = customerQuery.toLowerCase();
        return customers.filter(c => c.name.toLowerCase().includes(q));
    }, [customerQuery, customers]);

    const filteredProducts = useMemo(() => {
        if (!codeInput.trim()) return [];
        const q = codeInput.toLowerCase();
        return products.filter(p => p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q));
    }, [codeInput, products]);

    const addProduct = (product: any) => {
        const existing = items.find(i => i.product_id === product.id);
        if (existing) {
            setItems(items.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
        } else {
            setItems([...items, {
                id: Date.now(),
                product_id: product.id,
                code: product.code,
                name: isRTL ? (product.name_ar || product.name) : product.name,
                unit: product.unit || 'pc',
                price: product.price || product.sell_price || 0,
                quantity: 1,
            }]);
        }
        setCodeInput('');
        setShowProductDropdown(false);
    };

    const handleSave = async () => {
        if (items.length === 0) return toast.error(isRTL ? "يرجى إضافة أصناف" : "Please add items");
        setSaving(true);
        try {
            const payload = {
                quotation_number: quotationNum,
                issue_date: issueDate,
                valid_until: validUntil,
                customer_id: selectedCustomer?.id,
                notes: notes,
                total: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
                items: items.map(i => ({
                    product_id: i.product_id,
                    quantity: i.quantity,
                    unit_price: i.price
                }))
            };
            await salesApi.createQuotation(payload);
            onClose();
        } catch (error) {

        }
        setSaving(false);
    };

    const lblCls = "block text-[11px] font-medium text-surface-200/50 mb-1 uppercase tracking-wider";

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-content !max-w-4xl !max-h-[90vh] flex flex-col">
                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-primary-500/5">
                    <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <span>📄</span> {isRTL ? 'إنشاء عرض سعر' : 'Create Quotation'}
                    </h2>
                    <span className="badge badge-primary text-xs">{quotationNum}</span>
                </div>

                {fetchingData ? (
                    <div className="p-20 text-center text-surface-400">{common.loading}</div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 border-b border-white/5 bg-surface-800/30">
                            <div ref={custRef} className="relative">
                                <label className={lblCls}>{s.customer}</label>
                                <input
                                    type="text"
                                    className="input-field w-full"
                                    value={customerQuery}
                                    onChange={e => { setCustomerQuery(e.target.value); setShowCustDropdown(true); }}
                                    placeholder={isRTL ? 'بحث بالاسم...' : 'Search customer...'}
                                />
                                {showCustDropdown && filteredCustomers.length > 0 && (
                                    <div className="absolute top-full start-0 end-0 z-50 mt-1 bg-surface-900 border border-white/10 rounded-xl overflow-hidden">
                                        {filteredCustomers.map(c => (
                                            <button key={c.id} className="w-full text-start px-3 py-2 hover:bg-white/5" onClick={() => { setSelectedCustomer(c); setCustomerQuery(c.name); setShowCustDropdown(false); }}>
                                                {c.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className={lblCls}>{isRTL ? 'تاريخ عرض السعر' : 'Issue Date'}</label>
                                <input type="date" className="input-field w-full" value={issueDate} readOnly />
                            </div>
                            <div>
                                <label className={lblCls}>{isRTL ? 'صالح حتى' : 'Valid Until'}</label>
                                <input type="date" className="input-field w-full" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
                            </div>
                        </div>

                        <div className="p-4 border-b border-white/5 flex gap-2" ref={productRef}>
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    className="input-field w-full"
                                    value={codeInput}
                                    onChange={e => { setCodeInput(e.target.value); setShowProductDropdown(true); }}
                                    placeholder={isRTL ? 'أضف صنف بالكود أو الاسم...' : 'Add item...'}
                                />
                                {showProductDropdown && filteredProducts.length > 0 && (
                                    <div className="absolute top-full start-0 end-0 z-50 mt-1 bg-surface-900 border border-white/10 rounded-xl overflow-hidden">
                                        {filteredProducts.map(p => (
                                            <button key={p.id} className="w-full text-start px-3 py-2 hover:bg-white/5 flex justify-between" onClick={() => addProduct(p)}>
                                                <span>{p.name}</span>
                                                <span className="text-primary-400 font-mono">{p.code}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto p-4">
                            <table className="data-table text-sm">
                                <thead>
                                    <tr>
                                        <th>{s.itemName}</th>
                                        <th className="w-24 text-center">{s.price}</th>
                                        <th className="w-24 text-center">{s.quantity}</th>
                                        <th className="w-32 text-end">{common.total}</th>
                                        <th className="w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map(item => (
                                        <tr key={item.id}>
                                            <td style={{ color: 'var(--text-primary)' }}>{item.name}</td>
                                            <td className="text-center">{item.price}</td>
                                            <td className="text-center">
                                                <input type="number" className="bg-transparent border-b border-white/10 w-16 text-center" value={item.quantity} onChange={e => setItems(items.map(it => it.id === item.id ? { ...it, quantity: +e.target.value } : it))} />
                                            </td>
                                            <td className="text-end font-bold text-primary-400">{item.price * item.quantity}</td>
                                            <td><button onClick={() => setItems(items.filter(it => it.id !== item.id))} className="text-red-500" aria-label={isRTL ? 'حذف' : 'Remove'}>×</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-4 border-t border-white/5 bg-surface-900/50 flex justify-between items-end gap-10">
                            <div className="flex-1">
                                <label className={lblCls}>{common.notes}</label>
                                <textarea rows={2} className="input-field w-full text-sm" value={notes} onChange={e => setNotes(e.target.value)} />
                            </div>
                            <div className="text-end space-y-2">
                                <p className="text-surface-400 text-sm uppercase tracking-wider">{isRTL ? 'إجمالي عرض السعر' : 'Quotation Total'}</p>
                                <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>SAR {items.reduce((s, i) => s + i.price * i.quantity, 0)}</p>
                                <button onClick={handleSave} disabled={saving} className="btn-primary px-10 py-3 w-full">
                                    {saving ? common.loading : (isRTL ? 'حفظ عرض السعر' : 'Save Quotation')}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
