import React, { memo } from 'react';

interface PurchasesTabsProps {
    isRTL: boolean;
    activeTab: 'purchases' | 'returns';
    setActiveTab: (tab: 'purchases' | 'returns') => void;
}

const PurchasesTabs = memo(function PurchasesTabs({ isRTL, activeTab, setActiveTab }: PurchasesTabsProps) {
    return (
        <div className="flex gap-2 p-1 bg-surface-100 dark:bg-surface-800/50 rounded-xl w-fit">
            <button 
                className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'purchases' ? 'bg-white dark:bg-surface-700 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'}`}
                onClick={() => setActiveTab('purchases')}
            >
                {isRTL ? 'فواتير المشتريات' : 'Purchase Invoices'}
            </button>
            <button 
                className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'returns' ? 'bg-white dark:bg-surface-700 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'}`}
                onClick={() => setActiveTab('returns')}
            >
                {isRTL ? 'مرتجعات المشتريات' : 'Purchase Returns'}
            </button>
        </div>
    );
});

export default PurchasesTabs;