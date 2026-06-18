'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { HelpCircle, X, Info, BookOpen, Settings } from 'lucide-react';

const helpData: Record<string, { title: string, titleEn: string, content: string, contentEn: string, steps: string[], stepsEn: string[] }> = {
    '/dashboard': {
        title: 'لوحة القيادة (الرئيسية)',
        titleEn: 'Main Dashboard',
        content: 'هذه هي الشاشة الرئيسية للنظام التي تمنحك نظرة عامة سريعة على أداء الشركة بالكامل.',
        contentEn: 'This is the main screen of the system giving you a quick overview of the company\'s entire performance.',
        steps: [
            'الرسوم البيانية تعرض المبيعات والمصروفات.',
            'الأرقام الكبيرة تعرض ملخص الأرباح والديون.',
            'استخدم الفلاتر العلوية لتخصيص التاريخ أو الفرع.'
        ],
        stepsEn: [
            'Charts display sales and expenses.',
            'Big numbers show profit and debt summaries.',
            'Use top filters to customize date or branch.'
        ]
    },
    '/sales': {
        title: 'إدارة المبيعات',
        titleEn: 'Sales Management',
        content: 'صفحة المبيعات تتيح لك إصدار فواتير البيع، وإدارة عروض الأسعار، ومتابعة المرتجعات.',
        contentEn: 'Sales page allows you to issue sales invoices, manage quotations, and track returns.',
        steps: [
            'انقر على "فاتورة جديدة" لإنشاء عملية بيع.',
            'يمكنك تتبع الفواتير غير المسددة من خلال تبويب الذمم.',
            'نظام نقاط البيع (POS) متصل مباشرة بهذه الشاشة.'
        ],
        stepsEn: [
            'Click "New Invoice" to create a sale.',
            'Track unpaid invoices through the receivables tab.',
            'POS system is directly connected to this screen.'
        ]
    },
    '/purchases': {
        title: 'إدارة المشتريات',
        titleEn: 'Purchases Management',
        content: 'من هنا يمكنك إضافة فواتير الشراء من الموردين، مما يؤثر مباشرة على المخزون (بالزيادة) وعلى الخزينة/الحسابات (بالنقص).',
        contentEn: 'Here you can add purchase invoices from suppliers, which directly affects inventory (increase) and treasury (decrease).',
        steps: [
            'استخدم "فاتورة شراء جديدة" لتسجيل بضاعة واردة.',
            'حدد المورد بدقة لتسجيل المديونيات بشكل صحيح.',
            'أي عملية شراء ستسمع فوراً في تقارير المخزون.'
        ],
        stepsEn: [
            'Use "New Purchase Invoice" to record incoming goods.',
            'Accurately select the supplier to record debts correctly.',
            'Any purchase will immediately reflect in inventory reports.'
        ]
    },
    '/inventory': {
        title: 'المخزون والمنتجات',
        titleEn: 'Inventory & Products',
        content: 'مقر التحكم في كل منتجاتك، الكميات، أسعار التكلفة، وأسعار البيع.',
        contentEn: 'The control center for all your products, quantities, cost prices, and selling prices.',
        steps: [
            'أضف أصناف جديدة باستخدام زر "إضافة منتج".',
            'يمكنك طباعة الباركود لكل منتج.',
            'راقب التنبيهات الحمراء للمنتجات التي أوشكت على النفاذ.'
        ],
        stepsEn: [
            'Add new items using the "Add Product" button.',
            'You can print barcodes for each product.',
            'Watch out for red alerts for items running low.'
        ]
    },
    '/accounting': {
        title: 'الحسابات والخزينة',
        titleEn: 'Accounting & Treasury',
        content: 'قلب النظام المالي. هنا يتم تسجيل كل حركة نقدية واردة أو صادرة.',
        contentEn: 'The heart of the financial system. Every incoming or outgoing cash movement is recorded here.',
        steps: [
            'يمكنك إضافة خزائن متعددة (كاش، بنك الرياض، الخ).',
            'سجل المصروفات اليومية (كهرباء، رواتب) من تبويب المصروفات.',
            'راجع تقارير الأرباح والخسائر للتحقق من صحة المركز المالي.'
        ],
        stepsEn: [
            'You can add multiple safes (Cash, Bank, etc.).',
            'Record daily expenses (electricity, salaries) from the Expenses tab.',
            'Review P&L reports to verify the financial position.'
        ]
    }
};

export default function HelpSystem({ locale }: { locale: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname() || '';
    const isRTL = locale === 'ar';

    // Find current page help
    let currentHelpKey = Object.keys(helpData).find(key => pathname.includes(key));
    if (!currentHelpKey && pathname === `/${locale}`) currentHelpKey = '/dashboard';
    
    const currentHelp = currentHelpKey ? helpData[currentHelpKey] : {
        title: isRTL ? 'مساعدة عامة' : 'General Help',
        titleEn: 'General Help',
        content: isRTL ? 'أنت تتصفح حالياً جزءاً من النظام. يمكنك استخدام القائمة الجانبية للتنقل بين الأقسام المختلفة.' : 'You are currently browsing a part of the system. You can use the sidebar to navigate between different sections.',
        contentEn: 'You are currently browsing a part of the system. You can use the sidebar to navigate between different sections.',
        steps: [],
        stepsEn: []
    };

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 rtl:right-auto rtl:left-6 z-50 p-4 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-2xl transition-all duration-300 hover:scale-110 flex items-center justify-center animate-bounce-slow"
                aria-label="Help System"
            >
                <HelpCircle className="w-6 h-6" />
            </button>

            {/* Sidebar Overlay */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999] transition-opacity"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Help Sidebar */}
            <div 
                className={`fixed top-0 bottom-0 ${isRTL ? 'left-0' : 'right-0'} w-full sm:w-[400px] bg-white dark:bg-[#1a1a2e] z-[1000] shadow-2xl transition-transform duration-300 ease-in-out transform ${isOpen ? 'translate-x-0' : isRTL ? '-translate-x-full' : 'translate-x-full'}`}
            >
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-surface-200 dark:border-white/10 bg-surface-50 dark:bg-white/5">
                        <div className="flex items-center gap-3 text-primary-600 dark:text-primary-400">
                            <BookOpen className="w-6 h-6" />
                            <h2 className="text-xl font-bold">{isRTL ? 'دليل النظام' : 'System Guide'}</h2>
                        </div>
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="p-2 text-surface-500 hover:bg-surface-200 dark:hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 flex-1 overflow-y-auto space-y-6">
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 rounded-2xl p-5">
                            <h3 className="text-lg font-black text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                                <Info className="w-5 h-5" />
                                {isRTL ? currentHelp.title : currentHelp.titleEn}
                            </h3>
                            <p className="text-blue-600 dark:text-blue-400 leading-relaxed text-sm">
                                {isRTL ? currentHelp.content : currentHelp.contentEn}
                            </p>
                        </div>

                        {(isRTL ? currentHelp.steps : currentHelp.stepsEn).length > 0 && (
                            <div>
                                <h4 className="text-sm font-bold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-4">
                                    {isRTL ? 'كيف تعمل هذه الصفحة؟' : 'How does this page work?'}
                                </h4>
                                <ul className="space-y-3">
                                    {(isRTL ? currentHelp.steps : currentHelp.stepsEn).map((step, idx) => (
                                        <li key={idx} className="flex gap-3 text-surface-700 dark:text-surface-300">
                                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 flex items-center justify-center text-sm font-bold">
                                                {idx + 1}
                                            </span>
                                            <span className="text-sm leading-relaxed">{step}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="mt-8 pt-8 border-t border-surface-200 dark:border-white/10">
                            <div className="flex items-start gap-3 bg-surface-50 dark:bg-white/5 p-4 rounded-xl">
                                <Settings className="w-5 h-5 text-amber-500 mt-0.5" />
                                <div>
                                    <h4 className="font-bold text-surface-900 dark:text-white text-sm mb-1">
                                        {isRTL ? 'تلميحة الخبراء' : 'Pro Tip'}
                                    </h4>
                                    <p className="text-xs text-surface-500 dark:text-surface-400 leading-relaxed">
                                        {isRTL 
                                            ? 'النظام مترابط! أي عملية بيع تنقص المخزون وتزيد النقدية تلقائياً بنظام القيد المزدوج.' 
                                            : 'The system is interconnected! Any sale decreases inventory and increases cash automatically using double-entry.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
