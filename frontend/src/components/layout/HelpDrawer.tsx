'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useModalA11y } from '@/hooks/useModalA11y';
import { getHelpForPath, HelpArticle } from '@/lib/helpRegistry';

interface HelpDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    locale: string;
}

export default function HelpDrawer({ isOpen, onClose, locale }: HelpDrawerProps) {
    const pathname = usePathname();
    const isRTL = locale === 'ar';
    const drawerRef = useModalA11y<HTMLDivElement>(isOpen, onClose);
    const [helpContent, setHelpContent] = useState<HelpArticle | null>(null);

    useEffect(() => {
        if (isOpen && pathname) {
            setHelpContent(getHelpForPath(pathname));
        }
    }, [isOpen, pathname]);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div 
                className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                ref={drawerRef}
                role="dialog"
                aria-modal="true"
                className={`fixed top-0 bottom-0 z-[120] w-full max-w-sm sm:max-w-md bg-white dark:bg-surface-900 shadow-2xl transition-transform duration-300 flex flex-col ${
                    isRTL ? 'left-0' : 'right-0'
                }`}
                style={{
                    transform: isOpen ? 'translateX(0)' : `translateX(${isRTL ? '-100%' : '100%'})`
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-surface-900 dark:text-white">
                            {isRTL ? 'مساعدة' : 'Help'}
                        </h2>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 rounded-lg text-surface-400 hover:text-surface-700 hover:bg-surface-200 dark:hover:text-surface-200 dark:hover:bg-surface-700 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    {helpContent ? (
                        <>
                            {/* Intro Section */}
                            <div>
                                <h3 className="text-lg font-bold mb-2 text-surface-900 dark:text-white">
                                    {isRTL ? helpContent.title.ar : helpContent.title.en}
                                </h3>
                                <p className="text-sm leading-relaxed text-surface-600 dark:text-surface-400">
                                    {isRTL ? helpContent.description.ar : helpContent.description.en}
                                </p>
                            </div>

                            {/* How It Works Section */}
                            <div className="p-4 rounded-2xl bg-primary-50 dark:bg-primary-900/10 border border-primary-100 dark:border-primary-900/20">
                                <h4 className="text-sm font-bold flex items-center gap-2 mb-3 text-primary-700 dark:text-primary-400">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    {isRTL ? 'كيف تعمل؟' : 'How It Works'}
                                </h4>
                                <ul className="space-y-3">
                                    {(isRTL ? helpContent.howItWorks.ar : helpContent.howItWorks.en).map((step, idx) => (
                                        <li key={idx} className="flex gap-3 text-sm text-surface-700 dark:text-surface-300">
                                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-200 dark:bg-primary-800 text-primary-700 dark:text-primary-300 flex items-center justify-center text-xs font-bold mt-0.5">
                                                {idx + 1}
                                            </span>
                                            <span className="leading-relaxed">{step}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Integration Section */}
                            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20">
                                <h4 className="text-sm font-bold flex items-center gap-2 mb-2 text-amber-700 dark:text-amber-400">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                    </svg>
                                    {isRTL ? 'الترابط في النظام' : 'System Integration'}
                                </h4>
                                <p className="text-sm leading-relaxed text-amber-800 dark:text-amber-200/80">
                                    {isRTL ? helpContent.integration.ar : helpContent.integration.en}
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-40 text-surface-400">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-surface-300 border-t-primary-600 mb-4" />
                            <p>{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2 rounded-xl font-bold bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                    >
                        {isRTL ? 'حسناً، فهمت' : 'Got it'}
                    </button>
                </div>
            </div>
        </>
    );
}
