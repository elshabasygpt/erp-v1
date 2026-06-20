'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { purchasesApi, suppliersApi } from '@/lib/api';
import { toast } from 'react-hot-toast';
import PriceCompareModal from './PriceCompareModal';

export default function SupplierPricesContent({ dict, locale }: { dict: any; locale: string }) {
    const isRTL = locale === 'ar';
    const [filters, setFilters] = useState({ search: '', supplier_id: '', active_only: false });
    const [comparingProductId, setComparingProductId] = useState<string | null>(null);

    const { data: suppliers = [] } = useQuery<any[]>({
        queryKey: ['suppliers', 'list', { limit: 100 }],
        queryFn: async () => {
            const res = await suppliersApi.getSuppliers({ limit: 100 });
            return res.data?.data || [];
        },
    });

    const { data: prices = [], isLoading } = useQuery<any[]>({
        queryKey: ['supplier-prices', filters],
        queryFn: async () => {
            const res = await purchasesApi.getSupplierPrices({ ...filters, limit: 50 });
            return res.data?.data || [];
        },
    });

    const getLastPurchaseColor = (dateStr: string | null) => {
        if (!dateStr) return 'text-gray-400';
        const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
        if (days <= 30) return 'text-green-600';
        if (days <= 90) return 'text-yellow-600';
        return 'text-red-500';
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold">
                    {isRTL ? '💰 قوائم أسعار الموردين' : '💰 Supplier Price Lists'}
                </h1>
                <div className="flex gap-2">
                    <Button variant="outline">
                        {isRTL ? 'استيراد جملة' : 'Bulk Import'}
                    </Button>
                    <Button>
                        {isRTL ? '+ إضافة سعر' : '+ Add Price'}
                    </Button>
                </div>
            </div>

            <Card className="p-4">
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <input
                        type="text"
                        placeholder={isRTL ? 'بحث: اسم القطعة / SKU / OEM' : 'Search: Name / SKU / OEM'}
                        value={filters.search}
                        onChange={(e: any) => setFilters((prev: any) => ({ ...prev, search: e.target.value }))}
                        className="input-field max-w-xs"
                    />
                    <select
                        className="border rounded px-3 py-2"
                        value={filters.supplier_id}
                        onChange={(e: any) => setFilters((prev: any) => ({ ...prev, supplier_id: e.target.value }))}
                    >
                        <option value="">{isRTL ? 'جميع الموردين' : 'All Suppliers'}</option>
                        {suppliers.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={filters.active_only}
                            onChange={(e: any) => setFilters((prev: any) => ({ ...prev, active_only: e.target.checked }))}
                        />
                        {isRTL ? 'نشط فقط' : 'Active Only'}
                    </label>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left rtl:text-right">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-300">
                            <tr>
                                <th className="px-4 py-3">{isRTL ? 'المنتج' : 'Product'}</th>
                                <th className="px-4 py-3">{isRTL ? 'المورد' : 'Supplier'}</th>
                                <th className="px-4 py-3">{isRTL ? 'السعر' : 'Price'}</th>
                                <th className="px-4 py-3">{isRTL ? 'الحد الأدنى' : 'Min Qty'}</th>
                                <th className="px-4 py-3">{isRTL ? 'توريد (أيام)' : 'Lead Time'}</th>
                                <th className="px-4 py-3">{isRTL ? 'آخر شراء' : 'Last Purchase'}</th>
                                <th className="px-4 py-3">{isRTL ? 'إجراءات' : 'Actions'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-8">{isRTL ? 'جاري التحميل...' : 'Loading...'}</td>
                                </tr>
                            ) : prices.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-8 text-gray-500">
                                        {isRTL ? 'لا توجد أسعار مطابقة' : 'No prices found'}
                                    </td>
                                </tr>
                            ) : prices.map((price) => (
                                <tr key={price.id} className="border-b dark:border-gray-700">
                                    <td className="px-4 py-3">
                                        <div className="font-semibold">{isRTL ? price.product?.name_ar || price.product?.name : price.product?.name}</div>
                                        <div className="text-xs text-gray-500">SKU: {price.product?.sku}</div>
                                        {price.product?.oem_number && <div className="text-xs text-gray-500">OEM: {price.product?.oem_number}</div>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div>{price.supplier?.name}</div>
                                        {price.supplier_sku && <div className="text-xs text-gray-500">Supp. SKU: {price.supplier_sku}</div>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="font-bold text-blue-700 dark:text-blue-300">
                                            {parseFloat(price.unit_price).toFixed(2)}
                                        </span>
                                        <span className="text-xs text-gray-400 mx-1">{price.currency_code}</span>
                                        {price.product?.cost_price && (
                                            <span className={`text-xs block mt-0.5 ${
                                                parseFloat(price.unit_price) < parseFloat(price.product.cost_price)
                                                    ? 'text-green-600' : 'text-red-500'
                                            }`}>
                                                {parseFloat(price.unit_price) < parseFloat(price.product.cost_price) ? '↓ ' : '↑ '}
                                                {Math.abs(parseFloat(price.unit_price) - parseFloat(price.product.cost_price)).toFixed(2)}
                                                {isRTL ? ' عن التكلفة' : ' vs cost'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">{parseFloat(price.min_quantity)}</td>
                                    <td className="px-4 py-3">{price.lead_time_days || '-'}</td>
                                    <td className={`px-4 py-3 ${getLastPurchaseColor(price.last_purchase_date)}`}>
                                        {price.last_purchase_date || '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2 text-xs">
                                            <button className="text-blue-600 hover:underline">{isRTL ? 'تعديل' : 'Edit'}</button>
                                            <button
                                                className="text-purple-600 hover:underline"
                                                onClick={() => setComparingProductId(price.product_id)}
                                            >
                                                {isRTL ? 'مقارنة' : 'Compare'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {comparingProductId && (
                <PriceCompareModal
                    productId={comparingProductId}
                    productName={prices.find(p => p.product_id === comparingProductId)?.product?.name || ''}
                    isRTL={isRTL}
                    onClose={() => setComparingProductId(null)}
                />
            )}
        </div>
    );
}
