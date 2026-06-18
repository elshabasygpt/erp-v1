"use client";

import React, { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import SalesAnalyticsTab from '@/components/analytics/SalesAnalyticsTab';
import CustomerAnalyticsTab from '@/components/analytics/CustomerAnalyticsTab';
import InventoryValuationTab from '@/components/analytics/InventoryValuationTab';
import AIForecastingTab from '@/components/analytics/AIForecastingTab';

export default function AdvancedAnalyticsPage() {
    const { isRTL, locale } = useLanguage();
    const [activeTab, setActiveTab] = useState<'sales' | 'customers' | 'inventory' | 'ai'>('sales');

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', {
            style: 'currency',
            currency: 'SAR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(value);
    };

    const tabs = [
        { id: 'sales', label: isRTL ? 'أداء المبيعات والربحية' : 'Sales & Profitability', icon: '📈' },
        { id: 'customers', label: isRTL ? 'رؤى العملاء والمنتجات' : 'Customer & Product Insights', icon: '👥' },
        { id: 'inventory', label: isRTL ? 'تقييم المخزون المتقدم' : 'Inventory Valuation', icon: '📦' },
        { id: 'ai', label: isRTL ? 'توقعات الذكاء الاصطناعي' : 'AI Forecasting', icon: '🤖' }
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-br from-violet-600 to-indigo-700 p-8 rounded-2xl text-white shadow-lg">
                <div className="flex items-center gap-3 mb-2">
                    <span className="text-4xl">📊</span>
                    <div>
                        <h1 className="text-2xl font-bold">{isRTL ? 'التحليلات المتقدمة والذكاء الاصطناعي' : 'Advanced Analytics & AI'}</h1>
                        <p className="text-violet-200 text-sm mt-1">
                            {isRTL 
                                ? 'مركز التحليلات الشامل لاتخاذ قرارات مدعومة بالبيانات والتوقعات الذكية' 
                                : 'Comprehensive analytics hub for data-driven decisions and smart forecasting'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 p-1 bg-surface-100 dark:bg-surface-800 rounded-xl overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                            activeTab === tab.id
                                ? 'bg-white dark:bg-surface-900 text-violet-600 dark:text-violet-400 shadow-sm border-b-2 border-b-violet-500'
                                : 'text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'
                        }`}
                    >
                        <span className="text-lg">{tab.icon}</span>
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="mt-6">
                {activeTab === 'sales' && <SalesAnalyticsTab locale={locale} formatCurrency={formatCurrency} />}
                {activeTab === 'customers' && <CustomerAnalyticsTab locale={locale} formatCurrency={formatCurrency} />}
                {activeTab === 'inventory' && <InventoryValuationTab locale={locale} formatCurrency={formatCurrency} />}
                {activeTab === 'ai' && <AIForecastingTab locale={locale} />}
            </div>
        </div>
    );
}


