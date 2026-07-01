'use client';

import { useState, useEffect } from 'react';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { useLanguage } from '@/i18n/LanguageContext';
import { inventoryApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function StockTransfersPage() {
    const { isRTL } = useLanguage();
    const [transfers, setTransfers] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const confirm = useConfirm();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [viewData, setViewData] = useState<any>(null); // For viewing mode
    
    // Form state
    const [formData, setFormData] = useState({ 
        from_warehouse_id: '', 
        to_warehouse_id: '', 
        notes: '',
        items: [{ product_id: '', quantity: 1 }]
    });

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [transRes, wareRes, prodRes] = await Promise.all([
                inventoryApi.getStockTransfers(),
                inventoryApi.getWarehouses(), 
                inventoryApi.getProducts()
            ]);
            setTransfers(transRes.data.data.transfers?.data || []);
            setWarehouses(wareRes.data.data.warehouses || []);
            setProducts(prodRes.data.data.products?.data || []);
        } catch (error) {

        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await inventoryApi.createStockTransfer(formData);
            setShowModal(false);
            setFormData({ from_warehouse_id: '', to_warehouse_id: '', notes: '', items: [{ product_id: '', quantity: 1 }] });
            loadData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error creating transfer');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleApprove = async (id: string) => {
        if (!await confirm(isRTL ? 'سيتم خصم المخزون من المستودع المصدر. هل أنت متأكد؟' : 'Stock will be deducted from the source warehouse. Are you sure?')) return;
        try {
            await inventoryApi.approveStockTransfer(id);
            setViewData(null);
            loadData();
        } catch (error: any) {
             toast.error(error.response?.data?.message || 'Error approving transfer');
        }
    };

    const handleReceive = async (id: string) => {
        if (!await confirm(isRTL ? 'سيتم إضافة المخزون إلى المستودع الوجهة. هل أنت متأكد؟' : 'Stock will be added to the destination warehouse. Are you sure?')) return;
        try {
            await inventoryApi.receiveStockTransfer(id);
            setViewData(null);
            loadData();
        } catch (error: any) {
             toast.error(error.response?.data?.message || 'Error receiving transfer');
        }
    };

    const addProductRow = () => {
        setFormData(prev => ({...prev, items: [...prev.items, { product_id: '', quantity: 1 }]}));
    };

    const updateProductRow = (index: number, field: string, value: any) => {
        const newItems = [...formData.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setFormData({ ...formData, items: newItems });
    };

    const removeProductRow = (index: number) => {
        setFormData(prev => ({...prev, items: prev.items.filter((_, i) => i !== index)}));
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{isRTL ? 'التحويلات المخزنية' : 'Stock Transfers'}</h1>
                    <p className="text-sm text-gray-500 mt-1">{isRTL ? 'إدارة أوامر نقل المخزون بين الفروع والمستودعات' : 'Manage stock transfer orders between branches and warehouses'}</p>
                </div>
                <button
                    onClick={() => {
                        setFormData({ from_warehouse_id: '', to_warehouse_id: '', notes: '', items: [{ product_id: '', quantity: 1 }] });
                        setShowModal(true);
                    }}
                    className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm font-medium"
                >
                    {isRTL ? '+ إصدار أمر تحويل' : '+ New Transfer Order'}
                </button>
            </div>

            {/* List Table */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="overflow-x-auto"><table className={`w-full text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4">{isRTL ? 'رقم المرجع' : 'Reference No.'}</th>
                            <th className="px-6 py-4">{isRTL ? 'من مستودع (مصدر)' : 'From Warehouse (Source)'}</th>
                            <th className="px-6 py-4">{isRTL ? 'إلى مستودع (وجهة)' : 'To Warehouse (Destination)'}</th>
                            <th className="px-6 py-4">{isRTL ? 'الحالة' : 'Status'}</th>
                            <th className="px-6 py-4">{isRTL ? 'تاريخ الإنشاء' : 'Created Date'}</th>
                            <th className="px-6 py-4 text-center">{isRTL ? 'إجراءات' : 'Actions'}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {transfers.map((tr) => (
                            <tr key={tr.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4 font-mono text-indigo-600 font-bold">{tr.reference_number}</td>
                                <td className="px-6 py-4 font-semibold text-gray-800">{tr.from_warehouse?.name || '---'}</td>
                                <td className="px-6 py-4 font-semibold text-gray-800">{tr.to_warehouse?.name || '---'}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-md text-xs font-bold
                                        ${tr.status === 'draft' ? 'bg-gray-100 text-gray-600' : ''}
                                        ${tr.status === 'in_transit' ? 'bg-blue-100 text-blue-700' : ''}
                                        ${tr.status === 'received' ? 'bg-green-100 text-green-700' : ''}
                                    `}>
                                        {tr.status === 'draft' && (isRTL ? 'مسودة' : 'Draft')}
                                        {tr.status === 'in_transit' && (isRTL ? 'في الطريق (معتمد)' : 'In Transit (Approved)')}
                                        {tr.status === 'received' && (isRTL ? 'مستلم' : 'Received')}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-gray-500">{new Date(tr.created_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}</td>
                                <td className="px-6 py-4 text-center">
                                    <button onClick={() => setViewData(tr)} className="text-indigo-600 hover:text-indigo-800 text-xs font-bold underline">
                                        {isRTL ? 'عرض/معالجة' : 'View / Process'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {transfers.length === 0 && !isLoading && (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">{isRTL ? 'لا توجد تحويلات مخزنية حالياً' : 'No stock transfers yet'}</td>
                            </tr>
                        )}
                    </tbody>
                </table></div>
            </div>

            {/* View / Process Modal */}
            {viewData && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden p-6">
                         <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900">{isRTL ? 'تفاصيل التحويل' : 'Transfer Details'}: {viewData.reference_number}</h2>
                            <button onClick={() => setViewData(null)} className="text-gray-400 hover:text-gray-600 text-2xl" aria-label={isRTL ? 'إغلاق' : 'Close'}>&times;</button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4 text-sm bg-gray-50 p-4 rounded-xl">
                            <div><span className="text-gray-500 block mb-1">{isRTL ? 'من مستودع (المُرسل)' : 'From Warehouse (Sender)'}</span> <span className="font-bold">{viewData.from_warehouse?.name}</span></div>
                            <div><span className="text-gray-500 block mb-1">{isRTL ? 'إلى مستودع (المُستلم)' : 'To Warehouse (Receiver)'}</span> <span className="font-bold">{viewData.to_warehouse?.name}</span></div>
                        </div>

                        <div className="mb-4">
                            <h3 className="font-bold mb-2">{isRTL ? 'المنتجات المحولة:' : 'Transferred Products:'}</h3>
                            <ul className="space-y-2 border border-gray-100 rounded-lg p-3">
                                {viewData.items?.map((item: any) => (
                                    <li key={item.id} className="flex justify-between items-center text-sm border-b last:border-0 border-gray-50 pb-2 last:pb-0">
                                        <span className="font-medium">{item.product?.name_ar || item.product?.name}</span>
                                        <span className="bg-indigo-100 text-indigo-800 px-2 rounded-md font-bold text-xs">{item.quantity} {isRTL ? 'حبة' : 'units'}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="flex gap-4 mt-8">
                            <button onClick={() => setViewData(null)} className="flex-1 py-2 bg-gray-100 rounded-lg text-gray-700 font-bold hover:bg-gray-200 transition-colors">{isRTL ? 'إغلاق' : 'Close'}</button>
                            {viewData.status === 'draft' && (
                                <button onClick={() => handleApprove(viewData.id)} className="flex-1 py-2 bg-blue-600 rounded-lg text-white font-bold hover:bg-blue-700 transition-colors">{isRTL ? 'اعتماد وصرف المخزون' : 'Approve & Issue Stock'}</button>
                            )}
                             {viewData.status === 'in_transit' && (
                                <button onClick={() => handleReceive(viewData.id)} className="flex-1 py-2 bg-green-600 rounded-lg text-white font-bold hover:bg-green-700 transition-colors">{isRTL ? 'إثبات استلام كامل' : 'Confirm Full Receipt'}</button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Create Transfer Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden p-6 max-h-[90vh] overflow-y-auto">
                         <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900">{isRTL ? 'إصدار أمر تحويل (مسودة)' : 'New Transfer Order (Draft)'}</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl" aria-label={isRTL ? 'إغلاق' : 'Close'}>&times;</button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{isRTL ? 'من مستودع (المُرسل)' : 'From Warehouse (Sender)'}</label>
                                    <select required value={formData.from_warehouse_id} onChange={e => setFormData({...formData, from_warehouse_id: e.target.value})} className="w-full border-gray-300 rounded-xl border p-2.5">
                                        <option value="">{isRTL ? 'اختر المستودع...' : 'Select warehouse...'}</option>
                                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{isRTL ? 'إلى مستودع (المُستلم)' : 'To Warehouse (Receiver)'}</label>
                                    <select required value={formData.to_warehouse_id} onChange={e => setFormData({...formData, to_warehouse_id: e.target.value})} className="w-full border-gray-300 rounded-xl border p-2.5">
                                        <option value="">{isRTL ? 'اختر المستودع...' : 'Select warehouse...'}</option>
                                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-sm">{isRTL ? 'المنتجات المراد تحويلها' : 'Products to Transfer'}</h3>
                                    <button type="button" onClick={addProductRow} className="text-xs bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm hover:bg-gray-50 font-medium">{isRTL ? '+ إضافة صف' : '+ Add Row'}</button>
                                </div>
                                {formData.items.map((item, index) => (
                                    <div key={index} className="flex gap-4 items-center mb-3">
                                        <div className="flex-1">
                                            <select required value={item.product_id} onChange={e => updateProductRow(index, 'product_id', e.target.value)} className="w-full border-gray-300 rounded-lg p-2 border text-sm">
                                                <option value="">{isRTL ? 'اختر المنتج...' : 'Select product...'}</option>
                                                {products.map(p => <option key={p.id} value={p.id}>{p.name_ar || p.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="w-32">
                                            <input type="number" step="0.01" min="0.01" required value={item.quantity} onChange={e => updateProductRow(index, 'quantity', e.target.value)} placeholder={isRTL ? 'الكمية' : 'Quantity'} className="w-full border-gray-300 rounded-lg p-2 border text-sm" />
                                        </div>
                                        {formData.items.length > 1 && (
                                            <button type="button" onClick={() => removeProductRow(index)} className="text-red-500 hover:text-red-700 p-2 bg-red-50 rounded-lg" aria-label={isRTL ? 'حذف' : 'Remove'}>&times;</button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{isRTL ? 'ملاحظات التحويل' : 'Transfer Notes'}</label>
                                <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full border-gray-300 rounded-xl border p-2" rows={2}></textarea>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200">{isRTL ? 'إلغاء' : 'Cancel'}</button>
                                <button type="submit" disabled={isSubmitting || formData.from_warehouse_id === formData.to_warehouse_id} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 flex-1">
                                    {isSubmitting ? (isRTL ? 'جاري الإصدار...' : 'Submitting...') : (isRTL ? 'إصدار أمر كمسودة' : 'Submit as Draft')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
