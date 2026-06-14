'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { salesApi, crmApi } from '@/lib/api';

interface ShippingModalProps {
    dict: any;
    locale: string;
    onClose: () => void;
}

export default function ShippingModal({ dict, locale, onClose }: ShippingModalProps) {
    const isRTL = locale === 'ar';
    const s = dict.sales;
    const common = dict.common;

    const [shippingNum] = useState('SHP-' + String(Math.floor(Math.random() * 900000) + 100000));
    const [shippingDate] = useState(new Date().toISOString().split('T')[0]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
    const [invoiceQuery, setInvoiceQuery] = useState('');
    const [showInvDropdown, setShowInvDropdown] = useState(false);
    const invRef = useRef<HTMLDivElement>(null);

    const [shippingCost, setShippingCost] = useState(0);
    const [carrier, setCarrier] = useState('');
    const [trackingNumber, setTrackingNumber] = useState('');
    const [address, setAddress] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const loadInvoices = async () => {
            try {
                const res = await salesApi.getInvoices();
                setInvoices(res.data?.data?.data || res.data?.data || []);
            } catch (error) {
                console.error("Failed to load invoices", error);
            }
        };
        loadInvoices();
    }, []);

    const filteredInvoices = useMemo(() => {
        if (!invoiceQuery.trim()) return [];
        const q = invoiceQuery.toLowerCase();
        return invoices.filter(i => i.invoice_number.toLowerCase().includes(q));
    }, [invoiceQuery, invoices]);

    const handleSave = async () => {
        if (!selectedInvoice) return alert(isRTL ? "يرجى اختيار فاتورة" : "Please select an invoice");
        setSaving(true);
        try {
            const payload = {
                shipping_number: shippingNum,
                sales_invoice_id: selectedInvoice.id,
                shipping_date: shippingDate,
                shipping_cost: shippingCost,
                carrier: carrier,
                tracking_number: trackingNumber,
                shipping_address: address,
                status: 'pending'
            };
            await salesApi.createShippingInvoice(payload);
            onClose();
        } catch (error) {
            console.error("Shipping save failed", error);
        }
        setSaving(false);
    };

    const lblCls = "block text-[11px] font-medium text-surface-200/50 mb-1 uppercase tracking-wider";

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-content !max-w-2xl animate-scale-in">
                <div className="p-4 border-b border-white/5 bg-blue-500/5 flex justify-between items-center">
                    <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <span>🚚</span> {isRTL ? 'تسجيل شحنة مبيعات' : 'Register Sales Shipment'}
                    </h2>
                    <span className="badge badge-info text-xs">{shippingNum}</span>
                </div>

                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div ref={invRef} className="relative">
                            <label className={lblCls}>{isRTL ? 'رقم الفاتورة' : 'Invoice Number'}</label>
                            <input
                                type="text"
                                className="input-field w-full"
                                value={invoiceQuery}
                                onChange={e => { setInvoiceQuery(e.target.value); setShowInvDropdown(true); }}
                                placeholder={isRTL ? 'ابحث عن فاتورة...' : 'Search invoice...'}
                            />
                            {showInvDropdown && filteredInvoices.length > 0 && (
                                <div className="absolute top-full start-0 end-0 z-50 mt-1 bg-surface-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                                    {filteredInvoices.map(i => (
                                        <button key={i.id} className="w-full text-start px-3 py-2 hover:bg-white/5 flex justify-between" onClick={() => { setSelectedInvoice(i); setInvoiceQuery(i.invoice_number); setShowInvDropdown(false); }}>
                                            <span>{i.invoice_number}</span>
                                            <span className="text-xs text-surface-400">{i.customer?.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div>
                            <label className={lblCls}>{isRTL ? 'شركة الشحن' : 'Carrier'}</label>
                            <input type="text" className="input-field w-full" value={carrier} onChange={e => setCarrier(e.target.value)} placeholder="SMSA, Aramex, etc." />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={lblCls}>{isRTL ? 'رقم التتبع' : 'Tracking Number'}</label>
                            <input type="text" className="input-field w-full" value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} />
                        </div>
                        <div>
                            <label className={lblCls}>{isRTL ? 'تكلفة الشحن' : 'Shipping Cost'}</label>
                            <input type="number" className="input-field w-full" value={shippingCost} onChange={e => setShippingCost(+e.target.value)} />
                        </div>
                    </div>

                    <div>
                        <label className={lblCls}>{isRTL ? 'عنوان الشحن' : 'Shipping Address'}</label>
                        <textarea rows={2} className="input-field w-full text-sm" value={address} onChange={e => setAddress(e.target.value)} placeholder={isRTL ? 'أدخل العنوان الكامل...' : 'Enter full address...'} />
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-white/5">
                        <button onClick={onClose} className="btn-secondary flex-1">{common.cancel}</button>
                        <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 py-3 text-lg font-bold">
                            {saving ? common.loading : (isRTL ? 'حفظ الشحنة' : 'Save Shipment')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
