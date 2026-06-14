'use client';

import { useState, useEffect } from 'react';
import { inventoryApi } from '@/lib/api';

export default function StockTransfersPage() {
    const [transfers, setTransfers] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
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
            console.error('Error loading data', error);
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
            alert(error.response?.data?.message || 'Error creating transfer');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleApprove = async (id: string) => {
        if (!confirm('سيتم خصم المخزون من المستودع المصدر. هل أنت متأكد؟')) return;
        try {
            await inventoryApi.approveStockTransfer(id);
            setViewData(null);
            loadData();
        } catch (error: any) {
             alert(error.response?.data?.message || 'Error approving transfer');
        }
    };

    const handleReceive = async (id: string) => {
        if (!confirm('سيتم إضافة المخزون إلى المستودع الوجهة. هل أنت متأكد؟')) return;
        try {
            await inventoryApi.receiveStockTransfer(id);
            setViewData(null);
            loadData();
        } catch (error: any) {
             alert(error.response?.data?.message || 'Error receiving transfer');
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
                    <h1 className="text-2xl font-bold text-gray-900">التحويلات المخزنية</h1>
                    <p className="text-sm text-gray-500 mt-1">إدارة أوامر نقل المخزون بين الفروع والمستودعات</p>
                </div>
                <button
                    onClick={() => {
                        setFormData({ from_warehouse_id: '', to_warehouse_id: '', notes: '', items: [{ product_id: '', quantity: 1 }] });
                        setShowModal(true);
                    }}
                    className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm font-medium"
                >
                    + إصدار أمر تحويل
                </button>
            </div>

            {/* List Table */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <table className="w-full text-right text-sm">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4">رقم المرجع</th>
                            <th className="px-6 py-4">من مستودع (مصدر)</th>
                            <th className="px-6 py-4">إلى مستودع (وجهة)</th>
                            <th className="px-6 py-4">الحالة</th>
                            <th className="px-6 py-4">تاريخ الإنشاء</th>
                            <th className="px-6 py-4 text-center">إجراءات</th>
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
                                        {tr.status === 'draft' && 'مسودة'}
                                        {tr.status === 'in_transit' && 'في الطريق (معتمد)'}
                                        {tr.status === 'received' && 'مستلم'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-gray-500">{new Date(tr.created_at).toLocaleDateString('ar-SA')}</td>
                                <td className="px-6 py-4 text-center">
                                    <button onClick={() => setViewData(tr)} className="text-indigo-600 hover:text-indigo-800 text-xs font-bold underline">
                                        عرض/معالجة
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {transfers.length === 0 && !isLoading && (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">لا توجد تحويلات مخزنية حالياً</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* View / Process Modal */}
            {viewData && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden p-6">
                         <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900">تفاصيل التحويل: {viewData.reference_number}</h2>
                            <button onClick={() => setViewData(null)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4 text-sm bg-gray-50 p-4 rounded-xl">
                            <div><span className="text-gray-500 block mb-1">من مستودع (المُرسل)</span> <span className="font-bold">{viewData.from_warehouse?.name}</span></div>
                            <div><span className="text-gray-500 block mb-1">إلى مستودع (المُستلم)</span> <span className="font-bold">{viewData.to_warehouse?.name}</span></div>
                        </div>

                        <div className="mb-4">
                            <h3 className="font-bold mb-2">المنتجات المحولة:</h3>
                            <ul className="space-y-2 border border-gray-100 rounded-lg p-3">
                                {viewData.items?.map((item: any) => (
                                    <li key={item.id} className="flex justify-between items-center text-sm border-b last:border-0 border-gray-50 pb-2 last:pb-0">
                                        <span className="font-medium">{item.product?.name_ar || item.product?.name}</span>
                                        <span className="bg-indigo-100 text-indigo-800 px-2 rounded-md font-bold text-xs">{item.quantity} حبة</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="flex gap-4 mt-8">
                            <button onClick={() => setViewData(null)} className="flex-1 py-2 bg-gray-100 rounded-lg text-gray-700 font-bold hover:bg-gray-200 transition-colors">إغلاق</button>
                            {viewData.status === 'draft' && (
                                <button onClick={() => handleApprove(viewData.id)} className="flex-1 py-2 bg-blue-600 rounded-lg text-white font-bold hover:bg-blue-700 transition-colors">اعتماد وصرف المخزون</button>
                            )}
                             {viewData.status === 'in_transit' && (
                                <button onClick={() => handleReceive(viewData.id)} className="flex-1 py-2 bg-green-600 rounded-lg text-white font-bold hover:bg-green-700 transition-colors">إثبات استلام كامل</button>
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
                            <h2 className="text-xl font-bold text-gray-900">إصدار أمر تحويل (مسودة)</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">من مستودع (المُرسل)</label>
                                    <select required value={formData.from_warehouse_id} onChange={e => setFormData({...formData, from_warehouse_id: e.target.value})} className="w-full border-gray-300 rounded-xl border p-2.5">
                                        <option value="">اختر المستودع...</option>
                                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">إلى مستودع (المُستلم)</label>
                                    <select required value={formData.to_warehouse_id} onChange={e => setFormData({...formData, to_warehouse_id: e.target.value})} className="w-full border-gray-300 rounded-xl border p-2.5">
                                        <option value="">اختر المستودع...</option>
                                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            
                            <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-sm">المنتجات المراد تحويلها</h3>
                                    <button type="button" onClick={addProductRow} className="text-xs bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm hover:bg-gray-50 font-medium">+ إضافة صف</button>
                                </div>
                                {formData.items.map((item, index) => (
                                    <div key={index} className="flex gap-4 items-center mb-3">
                                        <div className="flex-1">
                                            <select required value={item.product_id} onChange={e => updateProductRow(index, 'product_id', e.target.value)} className="w-full border-gray-300 rounded-lg p-2 border text-sm">
                                                <option value="">اختر المنتج...</option>
                                                {products.map(p => <option key={p.id} value={p.id}>{p.name_ar || p.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="w-32">
                                            <input type="number" step="0.01" min="0.01" required value={item.quantity} onChange={e => updateProductRow(index, 'quantity', e.target.value)} placeholder="الكمية" className="w-full border-gray-300 rounded-lg p-2 border text-sm" />
                                        </div>
                                        {formData.items.length > 1 && (
                                            <button type="button" onClick={() => removeProductRow(index)} className="text-red-500 hover:text-red-700 p-2 bg-red-50 rounded-lg">&times;</button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات التحويل</label>
                                <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full border-gray-300 rounded-xl border p-2" rows={2}></textarea>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200">إلغاء</button>
                                <button type="submit" disabled={isSubmitting || formData.from_warehouse_id === formData.to_warehouse_id} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 flex-1">
                                    {isSubmitting ? 'جاري الإصدار...' : 'إصدار أمر كمسودة'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
