'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { inventoryApi } from '@/lib/api';
import ProductImportModal from '../ProductImportModal';
import ProductExportModal from '../ProductExportModal';
import ImportHistoryTab from './ImportHistoryTab';
import ImportUndoTab from './ImportUndoTab';
import ImportSettingsTab from './ImportSettingsTab';
import toast from 'react-hot-toast';
import axios from 'axios';

interface Props {
    dict: any;
    locale: string;
}

type TabType = 'import' | 'export' | 'template' | 'history' | 'undo' | 'settings';

export default function ImportCenterClient({ dict, locale }: Props) {
    const isRTL = locale === 'ar';
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabType>('import');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab') as TabType;
        if (tab && ['import', 'export', 'template', 'history', 'undo', 'settings'].includes(tab)) {
            setActiveTab(tab);
        }
    }, []);
    
    // Fetch data needed for sub-components (if any)
    const { data: productsData } = useQuery({ queryKey: ['products'], queryFn: () => inventoryApi.getProducts() });
    const { data: groupsData } = useQuery({ queryKey: ['main-groups'], queryFn: () => inventoryApi.getCategories() });
    const { data: warehousesData } = useQuery({ queryKey: ['warehouses'], queryFn: () => inventoryApi.getWarehouses() });

    const products = productsData?.data?.data || [];
    const groups = groupsData?.data?.data || [];
    const warehouses = warehousesData?.data?.data || [];

    const menuItems: { id: TabType; label: string; icon: string }[] = [
        { id: 'import', label: isRTL ? 'استيراد المنتجات' : 'Import Products', icon: '📥' },
        { id: 'export', label: isRTL ? 'تصدير المنتجات' : 'Export Products', icon: '📤' },
        { id: 'template', label: isRTL ? 'تحميل نموذج Excel' : 'Download Template', icon: '📄' },
        { id: 'history', label: isRTL ? 'سجل الاستيراد' : 'Import History', icon: '📜' },
        { id: 'undo', label: isRTL ? 'التراجع عن آخر استيراد' : 'Undo Last Import', icon: '↩' },
        { id: 'settings', label: isRTL ? 'إعدادات الاستيراد' : 'Import Settings', icon: '⚙' },
    ];

    const handleDownloadTemplate = async () => {
        try {
            const token = localStorage.getItem('token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL + '/api/tenant/products/import-template';
            const response = await axios.get(apiUrl, { headers: { 'Authorization': `Bearer ${token}` }, responseType: 'blob' });
            const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'product_import_template.xlsx';
            link.click();
            toast.success(isRTL ? 'تم تحميل النموذج بنجاح' : 'Template downloaded successfully');
        } catch (error) {
            toast.error(isRTL ? 'فشل تحميل النموذج' : 'Failed to download template');
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <Link href={`/${locale}/dashboard/inventory`} className="text-surface-500 hover:text-primary-600 transition-colors">
                            <span className="text-2xl">{isRTL ? '←' : '→'}</span>
                        </Link>
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                            {isRTL ? '🚀 مركز استيراد المنتجات' : '🚀 Product Import Center'}
                        </h1>
                    </div>
                    <p className="text-sm mt-1 text-surface-500" style={{ marginLeft: isRTL ? 0 : '2.5rem', marginRight: isRTL ? '2.5rem' : 0 }}>
                        {isRTL ? 'المحرك الذكي الشامل لاستيراد وتصدير بيانات المخزون' : 'Enterprise Smart Round-Trip Excel Engine'}
                    </p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
                {/* Sidebar Navigation */}
                <div className="w-full md:w-64 shrink-0">
                    <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-sm border border-surface-200 dark:border-surface-700 overflow-hidden sticky top-6">
                        <div className="p-4 bg-surface-50 dark:bg-surface-800/50 border-b border-surface-200 dark:border-surface-700">
                            <h3 className="font-bold text-surface-700 dark:text-surface-300">
                                {isRTL ? 'قائمة المركز' : 'Center Menu'}
                            </h3>
                        </div>
                        <nav className="p-2 flex flex-col gap-1">
                            {menuItems.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        if (item.id === 'template') {
                                            handleDownloadTemplate();
                                        } else {
                                            setActiveTab(item.id);
                                        }
                                    }}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-start font-semibold transition-all duration-200 ${
                                        activeTab === item.id && item.id !== 'template'
                                            ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' 
                                            : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700'
                                    }`}
                                >
                                    <span className="text-xl">{item.icon}</span>
                                    <span>{item.label}</span>
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 min-w-0">
                    <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-sm border border-surface-200 dark:border-surface-700 min-h-[600px] relative overflow-hidden">
                        
                        {activeTab === 'import' && (
                            <div className="h-full">
                                {/* We embed the ProductImportModal but pass a special prop or just render it inline. 
                                    Since ProductImportModal renders a full screen overlay by default, we'll need to strip its overlay wrapper 
                                    or just render its inner content. For now, since it relies on being a modal, we can show a placeholder that triggers it, 
                                    OR better yet, modify it to accept an `inline` prop! 
                                    For now, we'll render it inline by wrapping it in a relative container and overriding classes using standard react techniques if needed. */}
                                <div className="absolute inset-0 z-0">
                                    <ProductImportModal 
                                        dict={dict} locale={locale} existingProducts={products} 
                                        onClose={() => router.push(`/${locale}/dashboard/inventory`)} onSuccess={() => {}} 
                                        isInline={true}
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === 'export' && (
                            <div className="h-full">
                                <div className="absolute inset-0 z-0 p-4">
                                    <ProductExportModal 
                                        dict={dict} locale={locale} groups={groups} warehouses={warehouses}
                                        onClose={() => router.push(`/${locale}/dashboard/inventory`)} 
                                        isInline={true}
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === 'history' && (
                            <div className="h-full">
                                <ImportHistoryTab locale={locale} />
                            </div>
                        )}

                        {activeTab === 'undo' && (
                            <div className="h-full">
                                <ImportUndoTab locale={locale} />
                            </div>
                        )}

                        {activeTab === 'settings' && (
                            <div className="h-full">
                                <ImportSettingsTab locale={locale} />
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}
