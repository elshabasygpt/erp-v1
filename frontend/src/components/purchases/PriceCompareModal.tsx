'use client';

import React, { useEffect, useState } from 'react';
import { purchasesApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useModalA11y } from '@/hooks/useModalA11y';

interface PriceCompareModalProps {
    productId: string;
    productName: string;
    isRTL: boolean;
    onClose: () => void;
    onSelectSupplier?: (supplierId: string, price: number) => void;
}

export default function PriceCompareModal({
    productId,
    productName,
    isRTL,
    onClose,
    onSelectSupplier
}: PriceCompareModalProps) {
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const modalRef = useModalA11y(true, onClose);

    useEffect(() => {
        purchasesApi.compareSupplierPrices(productId)
            .then(res => setData(res.data?.data))
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, [productId]);

    const getPriceStyle = (price: number, currentCost: number) => {
        const diff = price - currentCost;
        if (diff < -5) return { cls: 'text-green-700 font-bold', label: `↓ ${Math.abs(diff).toFixed(2)} ${isRTL ? 'توفير' : 'Savings'}` };
        if (diff > 5)  return { cls: 'text-red-600', label: `↑ ${diff.toFixed(2)} ${isRTL ? 'أغلى' : 'More expensive'}` };
        return { cls: 'text-gray-600', label: isRTL ? '≈ سعر التكلفة' : '≈ Cost price' };
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div ref={modalRef} role="dialog" aria-modal="true" className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        📊 {isRTL ? 'مقارنة أسعار الموردين' : 'Supplier Price Comparison'} — {productName}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl font-bold leading-none" aria-label={isRTL ? 'إغلاق' : 'Close'}>&times;</button>
                </div>

                <div className="p-4 flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="text-center py-10">{isRTL ? 'جاري التحميل...' : 'Loading...'}</div>
                    ) : !data ? (
                        <div className="text-center py-10 text-red-500">{isRTL ? 'حدث خطأ' : 'Error occurred'}</div>
                    ) : (
                        <>
                            <div className="mb-6 p-3 bg-gray-50 dark:bg-gray-900 rounded border">
                                <div className="text-sm">SKU: <span className="font-semibold">{data.product?.sku || '-'}</span></div>
                                <div className="text-sm">OEM: <span className="font-semibold">{data.product?.oem_number || '-'}</span></div>
                                <div className="text-sm mt-1 font-medium">
                                    {isRTL ? 'التكلفة الحالية: ' : 'Current Cost: '}
                                    <span className="text-blue-600">{parseFloat(data.product?.cost_price || 0).toFixed(2)} SAR</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {data.prices?.length === 0 ? (
                                    <div className="text-center text-gray-500 py-4">
                                        {isRTL ? 'لا توجد أسعار مسجلة لهذا المنتج.' : 'No prices recorded for this product.'}
                                    </div>
                                ) : (
                                    data.prices.map((p: any) => {
                                        const currentCost = parseFloat(data.product?.cost_price || 0);
                                        const style = getPriceStyle(p.unit_price, currentCost);
                                        return (
                                            <div
                                                key={p.id}
                                                className={`p-4 rounded border flex flex-col sm:flex-row justify-between gap-4 ${
                                                    p.is_cheapest ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/10' : 'border-gray-200 dark:border-gray-700'
                                                }`}
                                            >
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-lg">{p.supplier_name}</span>
                                                        {p.is_cheapest && <span className="text-xl" title={isRTL ? 'الأرخص' : 'Cheapest'}>🥇</span>}
                                                    </div>
                                                    <div className="text-sm text-gray-500 mt-1">
                                                        {isRTL ? 'توريد: ' : 'Lead time: '} {p.lead_time_days ? `${p.lead_time_days} ${isRTL ? 'أيام' : 'days'}` : '-'} |
                                                        {' '}{isRTL ? 'آخر شراء: ' : 'Last purchase: '} {p.last_purchase_date || '-'}
                                                    </div>
                                                </div>

                                                <div className="text-left sm:text-right flex flex-col items-start sm:items-end justify-center">
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="font-bold text-xl">{p.unit_price.toFixed(2)}</span>
                                                        <span className="text-sm text-gray-500">{p.currency_code}</span>
                                                        {currentCost > 0 && (
                                                            <span className={`text-xs ml-2 ${style.cls}`}>{style.label}</span>
                                                        )}
                                                    </div>
                                                    
                                                    {onSelectSupplier && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="mt-2"
                                                            onClick={() => onSelectSupplier(p.supplier_id, p.unit_price)}
                                                        >
                                                            {isRTL ? 'اختر هذا المورد' : 'Select Supplier'}
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
