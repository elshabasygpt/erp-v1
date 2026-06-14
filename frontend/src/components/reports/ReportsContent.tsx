'use client';

import React, { useState, useEffect } from 'react';
import { reportsApi } from '@/lib/api';

export default function ReportsContent({ dict, locale }: { dict: any, locale: string }) {
    const isRTL = locale === 'ar';
    const [activeTab, setActiveTab] = useState('pl');

    const [plData, setPlData] = useState<any>(null);
    const [invData, setInvData] = useState<any>(null);
    const [acctData, setAcctData] = useState<any>(null);
    const [kpiData, setKpiData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [pl, inv, acct, kpi] = await Promise.all([
                reportsApi.getProfitAndLoss(),
                reportsApi.getInventoryReport(),
                reportsApi.getAccountsReport(),
                reportsApi.getGeneralKpis()
            ]);
            setPlData(pl.data);
            setInvData(inv.data);
            setAcctData(acct.data);
            setKpiData(kpi.data);
        } catch (e) {
            console.error('Failed to load reports', e);
        }
        setLoading(false);
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
    }

    const tabs = [
        { id: 'pl', label: isRTL ? 'الأرباح والخسائر' : 'Profit & Loss', icon: '📈' },
        { id: 'inventory', label: isRTL ? 'تقييم المخزون' : 'Inventory Valuation', icon: '📦' },
        { id: 'accounts', label: isRTL ? 'السيولة والخزائن' : 'Treasury & Accounts', icon: '💰' },
        { id: 'crm', label: isRTL ? 'العملاء والموردين' : 'CRM & Suppliers', icon: '👥' },
    ];

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Header KPIs */}
            {kpiData && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="stat-card bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
                        <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1">{isRTL ? 'إجمالي العملاء' : 'Total Customers'}</p>
                        <h3 className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{kpiData.customers_count}</h3>
                    </div>
                    <div className="stat-card bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">{isRTL ? 'إجمالي الموردين' : 'Total Suppliers'}</p>
                        <h3 className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{kpiData.suppliers_count}</h3>
                    </div>
                    <div className="stat-card bg-gradient-to-br from-orange-500/10 to-amber-500/10 border-orange-500/20">
                        <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-1">{isRTL ? 'إجمالي الموظفين' : 'Total Employees'}</p>
                        <h3 className="text-2xl font-bold text-orange-700 dark:text-orange-300">{kpiData.employees_count}</h3>
                    </div>
                    <div className="stat-card bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
                        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">{isRTL ? 'إجمالي الأصناف' : 'Total Items'}</p>
                        <h3 className="text-2xl font-bold text-blue-700 dark:text-blue-300">{invData?.total_items || 0}</h3>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-surface-100 dark:bg-surface-800 rounded-xl overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                            activeTab === tab.id
                                ? 'bg-white dark:bg-surface-900 text-primary-600 dark:text-primary-400 shadow-sm'
                                : 'text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'
                        }`}
                    >
                        <span>{tab.icon}</span>
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="mt-6">
                {activeTab === 'pl' && plData && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="panel p-6 space-y-6">
                            <h3 className="text-lg font-bold border-b pb-3 mb-4">{isRTL ? 'ملخص الدخل' : 'Income Summary'}</h3>
                            
                            <div className="flex justify-between items-center bg-green-500/10 p-4 rounded-xl border border-green-500/20">
                                <div>
                                    <p className="text-sm text-green-700 dark:text-green-400 font-medium">{isRTL ? 'المبيعات المنجزة' : 'Completed Sales'}</p>
                                    <h4 className="text-xl font-bold text-green-800 dark:text-green-300 mt-1">{plData.revenues.sales.toLocaleString()} SAR</h4>
                                </div>
                                <span className="text-3xl">💵</span>
                            </div>

                            <div className="flex justify-between items-center bg-red-500/10 p-4 rounded-xl border border-red-500/20">
                                <div>
                                    <p className="text-sm text-red-700 dark:text-red-400 font-medium">{isRTL ? 'مصروفات تشغيلية' : 'Operating Expenses'}</p>
                                    <h4 className="text-xl font-bold text-red-800 dark:text-red-300 mt-1">{plData.expenses.operating_expenses.toLocaleString()} SAR</h4>
                                </div>
                                <span className="text-3xl">📉</span>
                            </div>

                            <div className="flex justify-between items-center bg-orange-500/10 p-4 rounded-xl border border-orange-500/20">
                                <div>
                                    <p className="text-sm text-orange-700 dark:text-orange-400 font-medium">{isRTL ? 'إجمالي المشتريات' : 'Total Purchases'}</p>
                                    <h4 className="text-xl font-bold text-orange-800 dark:text-orange-300 mt-1">{plData.expenses.purchases.toLocaleString()} SAR</h4>
                                </div>
                                <span className="text-3xl">🛒</span>
                            </div>
                        </div>

                        <div className="panel p-6 flex flex-col justify-center items-center text-center bg-gradient-to-br from-surface-100 to-surface-50 dark:from-surface-800 dark:to-surface-900">
                            <h3 className="text-xl font-medium text-surface-600 dark:text-surface-400 mb-2">{isRTL ? 'صافي الدخل الحالي' : 'Current Net Income'}</h3>
                            <div className={`text-5xl font-extrabold ${plData.net_income >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {plData.net_income > 0 ? '+' : ''}{plData.net_income.toLocaleString()}
                                <span className="text-lg ms-2 text-surface-500 uppercase">SAR</span>
                            </div>
                            <p className="text-sm text-surface-500 mt-4 max-w-sm">
                                {isRTL 
                                    ? 'هذا الرقم يعكس صافي الدخل الفعلي بناءً على المبيعات المنجزة مطروحاً منها المصروفات وقيمة المشتريات المستلمة.'
                                    : 'This number reflects the actual net income based on completed sales minus expenses and received purchases.'}
                            </p>
                        </div>
                    </div>
                )}

                {activeTab === 'inventory' && invData && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="panel p-6 flex flex-col justify-center items-center text-center bg-primary-500/5 border-primary-500/20 border">
                            <span className="text-5xl mb-4">💎</span>
                            <h3 className="text-xl font-medium text-surface-600 dark:text-surface-400 mb-2">{isRTL ? 'القيمة التقديرية للمخزون' : 'Estimated Inventory Value'}</h3>
                            <div className="text-4xl font-extrabold text-primary-600 dark:text-primary-400">
                                {invData.estimated_inventory_value.toLocaleString()}
                                <span className="text-lg ms-2 text-surface-500 uppercase">SAR</span>
                            </div>
                        </div>

                        <div className="panel p-6">
                            <h3 className="text-lg font-bold flex items-center gap-2 text-red-500 mb-4">
                                <span>⚠️</span> {isRTL ? 'أصناف أوشكت على النفاد' : 'Low Stock Alerts'}
                            </h3>
                            {invData.low_stock_alerts.length === 0 ? (
                                <p className="text-surface-500 text-center py-4">{isRTL ? 'لا توجد تنبيهات للمخزون' : 'No stock alerts'}</p>
                            ) : (
                                <div className="space-y-3">
                                    {invData.low_stock_alerts.map((item: any) => (
                                        <div key={item.id} className="flex justify-between items-center p-3 bg-red-500/5 rounded-lg border border-red-500/10">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-sm">{item.name}</span>
                                                <span className="text-xs text-surface-500">{item.sku}</span>
                                            </div>
                                            <div className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 font-bold px-3 py-1 rounded-full text-xs">
                                                {item.stock_quantity} {isRTL ? 'متبقي' : 'left'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'accounts' && acctData && (
                    <div className="space-y-6">
                        <div className="panel p-6">
                            <h3 className="text-lg font-bold mb-6">{isRTL ? 'إجمالي السيولة النقدية' : 'Total Cash Liquidity'}</h3>
                            <div className="text-4xl font-extrabold text-teal-600 dark:text-teal-400 text-center mb-8">
                                {acctData.total_liquidity.toLocaleString()} <span className="text-lg">SAR</span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {acctData.safes.map((safe: any) => (
                                    <div key={safe.id} className="p-4 rounded-xl border bg-surface-50 dark:bg-surface-800">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-medium text-surface-700 dark:text-surface-300">{safe.name}</span>
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-surface-200 dark:bg-surface-700">{safe.type}</span>
                                        </div>
                                        <div className="text-xl font-bold">{parseFloat(safe.balance).toLocaleString()}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'crm' && (
                    <div className="panel p-10 flex flex-col items-center justify-center text-center">
                        <span className="text-6xl mb-4">🤝</span>
                        <h2 className="text-2xl font-bold text-surface-800 dark:text-surface-200 mb-2">
                            {isRTL ? 'إدارة علاقات العملاء والموردين' : 'CRM & Supplier Management'}
                        </h2>
                        <p className="text-surface-500 max-w-lg">
                            {isRTL 
                                ? 'يتم هنا استعراض كشف الحساب المفصل والمجمّع لكل جهة (عميل/مورد). انتقل إلى واجهة العملاء أو الموردين لطباعة كشوفات الحساب.'
                                : 'Detailed ledger for each contact goes here. Navigate to Customers/Suppliers views to print account statements.'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
