'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { salesApi, inventoryApi, crmApi } from '@/lib/api';

interface POSItem {
    id: number;
    product_id: number;
    code: string;
    name: string;
    unit: string;
    price: number;
    quantity: number;
}

interface SalesOrderModalProps {
    dict: any;
    locale: string;
    onClose: () => void;
    quotation?: any; // If converting from quotation
}

export default function SalesOrderModal({ dict, locale, onClose, quotation }: SalesOrderModalProps) {
    const isRTL = locale === 'ar';
    const s = dict.sales;
    const common = dict.common;

    const [orderNum] = useState('SO-' + String(Math.floor(Math.random() * 900000) + 100000));
    const [issueDate] = useState(new Date().toISOString().split('T')[0]);
    const [deliveryDate, setDeliveryDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return d.toISOString().split('T')[0];
    });
    
    const [items, setItems] = useState<POSItem[]>([]);
    const [saving, setSaving] = useState(false);
    const [notes, setNotes] = useState(quotation?.notes || '');

    const [products, setProducts] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [fetchingData, setFetchingData] = useState(true);

    const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
    const [customerQuery, setCustomerQuery] = useState('');
    const [showCustDropdown, setShowCustDropdown] = useState(false);
    const custRef = useRef<HTMLDivElement>(null);

    const [selectedWarehouse, setSelectedWarehouse] = useState('');

    const [codeInput, setCodeInput] = useState('');
    const [showProductDropdown, setShowProductDropdown] = useState(false);
    const productRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadInitialData = async () => {
            setFetchingData(true);
            try {
                const [pRes, cRes, wRes] = await Promise.all([
                    inventoryApi.getProducts(),
                    crmApi.getCustomers(),
                    inventoryApi.getWarehouses()
                ]);
                setProducts(pRes.data?.data?.data || pRes.data?.data || []);
                const custs = cRes.data?.data?.data || cRes.data?.data || [];
                setCustomers(custs);
                const whs = wRes.data?.data || [];
                setWarehouses(whs);

                if (whs.length > 0) {
                    setSelectedWarehouse(whs[0].id);
                }

                if (quotation) {
                    if (quotation.customer) {
                        setSelectedCustomer(quotation.customer);
                        setCustomerQuery(quotation.customer.name);
                    } else if (quotation.customer_id) {
                        const qc = custs.find((c: any) => c.id === quotation.customer_id);
                        if (qc) {
                            setSelectedCustomer(qc);
                            setCustomerQuery(qc.name);
                        }
                    }
                    if (quotation.items) {
                        setItems(quotation.items.map((i: any) => ({
                            id: Math.random(),
                            product_id: i.product_id,
                            code: i.product?.code || '---',
                            name: isRTL ? (i.product?.name_ar || i.product?.name) : i.product?.name,
                            unit: i.product?.unit || 'pc',
                            price: i.unit_price,
                            quantity: i.quantity,
                        })));
                    }
                }
            } catch (error) {
                console.error("Failed to load SO data", error);
            }
            setFetchingData(false);
        };
        loadInitialData();
    }, [quotation, isRTL]);

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
        if (!selectedCustomer) return alert(isRTL ? "يرجى اختيار العميل" : "Please select a customer");
        if (!selectedWarehouse) return alert(isRTL ? "يرجى اختيار المستودع" : "Please select a warehouse");
        if (items.length === 0) return alert(isRTL ? "يرجى إضافة أصناف" : "Please add items");
        
        setSaving(true);
        try {
            const payload = {
                customer_id: selectedCustomer.id,
                warehouse_id: selectedWarehouse,
                quotation_id: quotation?.id,
                delivery_date: deliveryDate,
                notes: notes,
                status: 'approved',
                items: items.map(i => ({
                    product_id: i.product_id,
                    quantity: i.quantity,
                    unit_price: i.price
                }))
            };
            await salesApi.createSalesOrder(payload);
            onClose();
        } catch (error) {
            console.error("Sales Order save failed", error);
            alert(isRTL ? "فشل إنشاء أمر البيع، تأكد من توفر المخزون" : "Failed to create sales order. Check stock availability.");
        }
        setSaving(false);
    };

    const lblCls = "block text-[11px] font-medium text-surface-200/50 mb-1 uppercase tracking-wider";

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-content !max-w-5xl !max-h-[90vh] flex flex-col">
                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-indigo-500/10">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-indigo-400">
                        <span>📦</span> {isRTL ? 'إنشاء أمر بيع (Sales Order)' : 'Create Sales Order'}
                    </h2>
                    <span className="badge badge-primary text-xs">{orderNum}</span>
                </div>

                {fetchingData ? (
                    <div className="p-20 text-center text-surface-400">{common.loading}</div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border-b border-white/5 bg-surface-800/30">
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
                                <label className={lblCls}>{isRTL ? 'المستودع (لحجز المخزون)' : 'Warehouse (Stock Reserve)'}</label>
                                <select className="select-field w-full" value={selectedWarehouse} onChange={e => setSelectedWarehouse(e.target.value)}>
                                    <option value="">{isRTL ? 'اختر المستودع' : 'Select Warehouse'}</option>
                                    {warehouses.map(w => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={lblCls}>{isRTL ? 'تاريخ الأمر' : 'Issue Date'}</label>
                                <input type="date" className="input-field w-full" value={issueDate} readOnly />
                            </div>
                            <div>
                                <label className={lblCls}>{isRTL ? 'تاريخ التوصيل' : 'Delivery Date'}</label>
                                <input type="date" className="input-field w-full" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} />
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
                                            <td><button onClick={() => setItems(items.filter(it => it.id !== item.id))} className="text-red-500">×</button></td>
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
                                <p className="text-surface-400 text-sm uppercase tracking-wider">{isRTL ? 'إجمالي الأمر' : 'Order Total'}</p>
                                <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>SAR {items.reduce((s, i) => s + i.price * i.quantity, 0)}</p>
                                <button onClick={handleSave} disabled={saving} className="btn-primary px-10 py-3 w-full bg-indigo-600 hover:bg-indigo-700">
                                    {saving ? common.loading : (isRTL ? 'تأكيد وحجز المخزون' : 'Confirm & Reserve Stock')}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
