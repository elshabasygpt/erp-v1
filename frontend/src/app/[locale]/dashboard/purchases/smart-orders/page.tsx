'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchasesApi, inventoryApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { CardSkeleton } from '@/components/ui/Skeleton';

export default function SmartOrdersPage({ params }: { params: { locale: string } }) {
    const isRTL = params.locale === 'ar';
    const { format: formatCurrency } = useCurrencyFormatter();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'lowStock' | 'schedules'>('lowStock');

    // 1. استعلام القطع الناقصة مجمعة حسب المورد
    const { data: lowStockData, isLoading: loadingLowStock, isError: errorLowStock, refetch: refetchLowStock } = useQuery({
        queryKey: ['smartOrdersLowStock'],
        queryFn: async () => {
            const res = await purchasesApi.getSmartOrderLowStock();
            return res.data?.data;
        }
    });

    // 2. استعلام جداول مواعيد الموردين
    const { data: schedulesData, isLoading: loadingSchedules, isError: errorSchedules, refetch: refetchSchedules } = useQuery({
        queryKey: ['supplierOrderSchedules'],
        queryFn: async () => {
            const res = await purchasesApi.getSmartOrderUpcoming();
            return res.data?.data;
        }
    });

    // 3. مسودة مورد واحد
    const draftOneMutation = useMutation({
        mutationFn: (data: { supplier_id: string; items: any[] }) =>
            purchasesApi.draftSmartOrder(data),
        onSuccess: () => {
            toast.success(isRTL ? 'تم إنشاء طلب شراء داخلي (PR) بنجاح' : 'Draft PR created successfully');
            queryClient.invalidateQueries({ queryKey: ['smart-orders-low-stock'] });
        },
        onError: () => {
            toast.error(isRTL ? 'حدث خطأ أثناء الإنشاء' : 'Error creating draft');
        }
    });

    // 4. مسودة لكل الموردين
    const draftAllMutation = useMutation({
        mutationFn: async () => {
            if (!lowStockData || !lowStockData.by_supplier) return { created: 0 };
            
            let createdCount = 0;
            // Iterate over all groups and call draftOne for each
            for (const group of lowStockData.by_supplier) {
                if (group.items && group.items.length > 0) {
                    await purchasesApi.draftSmartOrder({
                        supplier_id: group.supplier_id,
                        items: group.items
                    });
                    createdCount++;
                }
            }
            return { created: createdCount };
        },
        onSuccess: (result) => {
            if (result && result.created > 0) {
                toast.success(isRTL ? `تم إنشاء ${result.created} طلب شراء داخلي` : `Created ${result.created} draft PRs`);
                queryClient.invalidateQueries({ queryKey: ['smart-orders-low-stock'] });
            } else {
                toast.success(isRTL ? 'لا توجد بيانات للإنشاء' : 'No data to draft');
            }
        },
        onError: () => {
            toast.error(isRTL ? 'حدث خطأ' : 'Error occurred');
        }
    });

    // 5. نقل مخزون
    const draftTransferMutation = useMutation({
        mutationFn: (data: any) => inventoryApi.createStockTransfer(data),
        onSuccess: () => {
            toast.success(isRTL ? 'تم طلب نقل المخزون بنجاح' : 'Stock transfer drafted successfully');
            queryClient.invalidateQueries({ queryKey: ['smartOrdersLowStock'] });
        },
        onError: () => {
            toast.error(isRTL ? 'حدث خطأ أثناء نقل المخزون' : 'Error drafting stock transfer');
        }
    });

    const handleDraftTransfer = (item: any, sugg: any, currentSupplierId: string) => {
        if (!item.target_warehouse_id) {
            toast.error(isRTL ? 'لا يمكن النقل: المستودع الحالي غير معروف' : 'Cannot transfer: target warehouse unknown');
            return;
        }
        
        draftTransferMutation.mutate({
            from_warehouse_id: sugg.warehouse_id,
            to_warehouse_id: item.target_warehouse_id,
            notes: 'Generated via Smart Rebalancing System',
            items: [
                {
                    product_id: item.product_id,
                    quantity: Math.min(item.order_qty, sugg.available_surplus)
                }
            ]
        });
        
        // Remove item from UI optimistic update
        queryClient.setQueryData(['smartOrdersLowStock'], (oldData: any) => {
            if (!oldData) return oldData;
            const newData = JSON.parse(JSON.stringify(oldData));
            
            // Search in by_supplier
            const currentGroupIndex = newData.by_supplier?.findIndex((g: any) => g.supplier_id === currentSupplierId) ?? -1;
            if (currentGroupIndex !== -1) {
                const currentGroup = newData.by_supplier[currentGroupIndex];
                const itemIndex = currentGroup.items.findIndex((i: any) => i.product_id === item.product_id);
                if (itemIndex !== -1) {
                    currentGroup.items.splice(itemIndex, 1);
                    if (currentGroup.items.length === 0) {
                        newData.by_supplier.splice(currentGroupIndex, 1);
                    }
                }
            } else {
                // Search in no_supplier
                const itemIndex = newData.no_supplier?.findIndex((i: any) => i.product_id === item.product_id) ?? -1;
                if (itemIndex !== -1) {
                    newData.no_supplier.splice(itemIndex, 1);
                }
            }
            return newData;
        });
    };

    const handleSwitchSupplier = (currentSupplierId: string, item: any, newSupplierId: string) => {
        if (!lowStockData) return;
        
        queryClient.setQueryData(['smartOrdersLowStock'], (oldData: any) => {
            if (!oldData) return oldData;
            
            // Deep clone the data structure
            const newData = JSON.parse(JSON.stringify(oldData));
            
            // Find current group and remove item
            const currentGroupIndex = newData.by_supplier.findIndex((g: any) => g.supplier_id === currentSupplierId);
            if (currentGroupIndex === -1) return oldData;
            
            const currentGroup = newData.by_supplier[currentGroupIndex];
            const itemIndex = currentGroup.items.findIndex((i: any) => i.product_id === item.product_id);
            if (itemIndex === -1) return oldData;
            
            // Get item and modify it for new supplier
            const movedItem = currentGroup.items.splice(itemIndex, 1)[0];
            movedItem.unit_price = movedItem.cheaper_alternative.unit_price;
            movedItem.supplier_id = newSupplierId; // Although it's grouped, keeping it accurate
            movedItem.cheaper_alternative = null; // Clear the recommendation once accepted
            
            // If current group is empty, remove it
            if (currentGroup.items.length === 0) {
                newData.by_supplier.splice(currentGroupIndex, 1);
            }
            
            // Find new group or create it
            const newGroupIndex = newData.by_supplier.findIndex((g: any) => g.supplier_id === newSupplierId);
            if (newGroupIndex >= 0) {
                newData.by_supplier[newGroupIndex].items.push(movedItem);
            } else {
                newData.by_supplier.push({
                    supplier_id: newSupplierId,
                    supplier_name: item.cheaper_alternative.supplier_name,
                    items: [movedItem]
                });
            }
            
            toast.success(isRTL ? `تم نقل ${movedItem.name} إلى ${item.cheaper_alternative.supplier_name}` : `Moved to ${item.cheaper_alternative.supplier_name}`);
            return newData;
        });
    };


    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                <div>
                    <h1 className="text-2xl font-bold text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
                        🤖 {isRTL ? 'نظام الطلبيات الذكية' : 'Smart Ordering System'}
                    </h1>
                    <p className="text-sm text-indigo-700/70 dark:text-indigo-300 mt-1">
                        {isRTL
                            ? 'إدارة تلقائية لمخزونك وطلبيات الموردين بناءً على معدلات السحب'
                            : 'Automated inventory management and supplier ordering'}
                    </p>
                </div>
                <div className="flex gap-3">
                        <Button 
                            size="lg" 
                            className="rounded-2xl px-8 shadow-lg shadow-primary/25 font-bold tracking-wide"
                            onClick={() => draftAllMutation.mutate()}
                            disabled={draftAllMutation.isPending}
                        >
                            {isRTL ? 'توليد أوامر شراء لكل الموردين 🚀' : 'Draft POs for All Suppliers 🚀'}
                        </Button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-800">
                <button
                    onClick={() => setActiveTab('lowStock')}
                    className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${
                        activeTab === 'lowStock'
                            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                >
                    📦 {isRTL ? 'القطع تحت الحد الأدنى' : 'Low Stock Items'}
                </button>
                <button
                    onClick={() => setActiveTab('schedules')}
                    className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${
                        activeTab === 'schedules'
                            ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                >
                    🗓️ {isRTL ? 'مواعيد الموردين' : 'Supplier Schedules'}
                </button>
            </div>

            {/* Content: Low Stock */}
            {activeTab === 'lowStock' && (
                <div className="space-y-6">
                    {loadingLowStock ? (
                        <div className="space-y-6">
                            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
                        </div>
                    ) : errorLowStock ? (
                        <div className="text-center p-8">
                            <p className="mb-3 text-sm" style={{ color: 'var(--text-danger, #dc2626)' }}>
                                {isRTL ? 'تعذّر تحميل البيانات.' : 'Failed to load data.'}
                            </p>
                            <button onClick={() => refetchLowStock()} className="btn-secondary py-1.5 px-4 text-xs">
                                🔄 {isRTL ? 'إعادة المحاولة' : 'Retry'}
                            </button>
                        </div>
                    ) : lowStockData?.by_supplier?.length > 0 ? (
                        lowStockData.by_supplier.map((group: any, idx: number) => {
                            const totalAmount = group.items.reduce((acc: number, item: any) => acc + (item.order_qty * item.unit_price), 0);
                            return (
                                <div key={idx} className="glass-card rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:shadow-md">
                                    <div className="bg-gray-50/50 dark:bg-gray-900/50 p-4 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-xl">
                                                🏢
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900 dark:text-white">{group.supplier_name}</h3>
                                                <p className="text-xs text-gray-500">{group.items.length} {isRTL ? 'أصناف تحتاج لطلب' : 'items to order'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-end hidden sm:block">
                                                <p className="text-xs text-gray-500">{isRTL ? 'إجمالي مقدر' : 'Est. Total'}</p>
                                                <p className="font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(totalAmount)}</p>
                                            </div>
                                            <Button 
                                            onClick={() => draftOneMutation.mutate({ 
                                                supplier_id: group.supplier_id, 
                                                items: group.items 
                                            })}
                                            disabled={draftOneMutation.isPending}
                                            className="bg-primary/10 hover:bg-primary/20 text-primary border-none shadow-sm rounded-xl px-6"
                                        >
                                            {isRTL ? 'توليد أمر شراء (PO)' : 'Draft PO'}
                                        </Button>
                                        </div>
                                    </div>
                                    <div className="p-0 overflow-x-auto">
                                        <table className="w-full text-sm text-left rtl:text-right">
                                            <thead className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800/50 uppercase">
                                                <tr>
                                                    <th className="px-4 py-3">{isRTL ? 'الصنف' : 'Product'}</th>
                                                    <th className="px-4 py-3">{isRTL ? 'رقم المصنع' : 'OEM'}</th>
                                                    <th className="px-4 py-3 text-center">{isRTL ? 'المخزون الحالي' : 'Stock'}</th>
                                                    <th className="px-4 py-3 text-center">{isRTL ? 'الحد الأدنى' : 'Min Stock'}</th>
                                                    <th className="px-4 py-3 text-center" title="المبيعات اليومية في آخر 30 يوم">
                                                        {isRTL ? 'السحب اليومي 📈' : 'Daily Velocity 📈'}
                                                    </th>
                                                    <th className="px-4 py-3 text-center">
                                                        {isRTL ? 'مدة التوريد 🚚' : 'Lead Time 🚚'}
                                                    </th>
                                                    <th className="px-4 py-3 text-center bg-indigo-50/50 dark:bg-indigo-900/10 text-indigo-700 dark:text-indigo-300">
                                                        {isRTL ? 'الكمية المقترحة' : 'Suggested Qty'}
                                                    </th>
                                                    <th className="px-4 py-3 text-end">{isRTL ? 'سعر الوحدة' : 'Unit Price'}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                                {group.items.map((item: any, i: number) => (
                                                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                                                            {isRTL ? item.name_ar : item.name}
                                                            {item.current_stock > item.min_stock && item.daily_velocity > 0 && (
                                                                <span className="block text-[10px] text-amber-600 dark:text-amber-500 mt-0.5">
                                                                    ⚠️ {isRTL ? 'سحب سريع' : 'Fast moving'}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.oem_number || item.sku}</td>
                                                        <td className="px-4 py-3 text-center font-bold text-red-500">{item.current_stock}</td>
                                                        <td className="px-4 py-3 text-center text-gray-500">{item.min_stock}</td>
                                                        <td className="px-4 py-3 text-center font-mono text-xs text-blue-600 dark:text-blue-400">
                                                            {item.daily_velocity} / {isRTL ? 'يوم' : 'day'}
                                                        </td>
                                                        <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">
                                                            {item.lead_time_days} {isRTL ? 'يوم' : 'days'}
                                                        </td>
                                                        <td className="px-4 py-3 text-center bg-indigo-50/30 dark:bg-indigo-900/5 font-bold text-indigo-600 dark:text-indigo-400">
                                                            {item.order_qty}
                                                        </td>
                                                        <td className="px-4 py-3 text-end align-top">
                                                            <div className="font-bold text-gray-900 dark:text-gray-100 mb-1">
                                                                {formatCurrency(item.unit_price)}
                                                            </div>
                                                            {item.cheaper_alternative && (
                                                                <div className="mt-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-2 text-xs text-start">
                                                                    <span className="text-green-700 dark:text-green-400 font-bold block mb-1">
                                                                        💡 {isRTL ? 'توصية ذكية (وفر التكلفة)' : 'Smart Save'}
                                                                    </span>
                                                                    <div className="text-gray-600 dark:text-gray-300">
                                                                        {isRTL ? `المورد: ` : `Supplier: `} 
                                                                        <span className="font-bold">{item.cheaper_alternative.supplier_name}</span>
                                                                    </div>
                                                                    <div className="text-gray-600 dark:text-gray-300">
                                                                        {isRTL ? `السعر: ` : `Price: `}
                                                                        <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(item.cheaper_alternative.unit_price)}</span>
                                                                    </div>
                                                                    <button 
                                                                        onClick={() => handleSwitchSupplier(group.supplier_id, item, item.cheaper_alternative.supplier_id)}
                                                                        className="mt-2 w-full flex items-center justify-center gap-1 bg-green-600 hover:bg-green-700 text-white py-1.5 px-2 rounded shadow-sm transition-all text-[11px] font-bold"
                                                                    >
                                                                        <span>⚡</span> {isRTL ? 'تغيير المورد واعتماد الأرخص' : 'Switch & Save'}
                                                                    </button>
                                                                </div>
                                                            )}
                                                            {item.rebalance_suggestions && item.rebalance_suggestions.length > 0 && (
                                                                <div className="mt-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-2 text-xs text-start">
                                                                    <span className="text-blue-700 dark:text-blue-400 font-bold block mb-1">
                                                                        🔄 {isRTL ? 'متوفر في فروع أخرى' : 'Surplus Available'}
                                                                    </span>
                                                                    {item.rebalance_suggestions.map((sugg: any, sIdx: number) => (
                                                                        <div key={sIdx} className="mb-2 last:mb-0 border-b border-blue-100 dark:border-blue-800/50 pb-1 last:border-0 last:pb-0">
                                                                            <div className="text-gray-600 dark:text-gray-300">
                                                                                {isRTL ? `المستودع: ` : `Warehouse: `} 
                                                                                <span className="font-bold">{sugg.warehouse_name}</span>
                                                                            </div>
                                                                            <div className="text-gray-600 dark:text-gray-300">
                                                                                {isRTL ? `الفائض المتاح: ` : `Surplus: `}
                                                                                <span className="font-bold text-blue-600 dark:text-blue-400">{sugg.available_surplus}</span>
                                                                            </div>
                                                                            <button 
                                                                                onClick={() => handleDraftTransfer(item, sugg, group.supplier_id)}
                                                                                className="mt-1.5 w-full flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded shadow-sm transition-all text-[11px] font-bold"
                                                                            >
                                                                                <span>📦</span> {isRTL ? 'طلب نقل مخزون' : 'Draft Transfer'}
                                                                            </button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                            <span className="text-5xl mb-4">✨</span>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                {isRTL ? 'المخزون في وضع ممتاز!' : 'Inventory is Healthy!'}
                            </h3>
                            <p className="text-gray-500 max-w-md">
                                {isRTL 
                                    ? 'لا توجد أصناف تحت الحد الأدنى حالياً لموردين مسجلين.' 
                                    : 'No items are currently below the minimum stock level for assigned suppliers.'}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Content: Schedules */}
            {activeTab === 'schedules' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {loadingSchedules ? (
                        Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
                    ) : errorSchedules ? (
                        <div className="col-span-full text-center p-8">
                            <p className="mb-3 text-sm" style={{ color: 'var(--text-danger, #dc2626)' }}>
                                {isRTL ? 'تعذّر تحميل البيانات.' : 'Failed to load data.'}
                            </p>
                            <button onClick={() => refetchSchedules()} className="btn-secondary py-1.5 px-4 text-xs">
                                🔄 {isRTL ? 'إعادة المحاولة' : 'Retry'}
                            </button>
                        </div>
                    ) : schedulesData?.length > 0 ? (
                        schedulesData.map((sched: any, idx: number) => (
                            <div key={idx} className="glass-card rounded-2xl p-5 border border-gray-100 dark:border-gray-800 relative overflow-hidden group hover:border-purple-300 dark:hover:border-purple-700 transition-all">
                                {sched.is_due_soon && (
                                    <div className="absolute top-0 right-0 w-2 h-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                                )}
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${sched.is_due_soon ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : 'bg-purple-100 text-purple-600 dark:bg-purple-900/30'}`}>
                                            🗓️
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 dark:text-white truncate max-w-[150px]">{sched.supplier_name}</h3>
                                            <p className="text-xs text-gray-500 flex items-center gap-1">
                                                <span>📞</span> {sched.supplier_phone || '---'}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                        sched.is_due_soon 
                                            ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' 
                                            : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                                    }`}>
                                        {sched.days_until_order === 0 
                                            ? (isRTL ? 'اليوم' : 'Today') 
                                            : (isRTL ? `بعد ${sched.days_until_order} يوم` : `In ${sched.days_until_order} days`)}
                                    </span>
                                </div>
                                
                                <div className="space-y-3 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">{isRTL ? 'تاريخ الطلبية:' : 'Order Date:'}</span>
                                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                                            {sched.order_day_name} {sched.next_order_date}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">{isRTL ? 'الاستلام المتوقع:' : 'Expected Delivery:'}</span>
                                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                                            {sched.expected_delivery}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
                                        <span className="text-gray-500">{isRTL ? 'أصناف تحتاج لطلب:' : 'Low Stock Items:'}</span>
                                        <span className={`font-bold ${sched.low_stock_items_count > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                            {sched.low_stock_items_count} {isRTL ? 'صنف' : 'item'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-12 text-gray-500">
                            {isRTL ? 'لم يتم إعداد جداول للموردين بعد.' : 'No supplier schedules configured yet.'}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
