import React, { memo } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { 
    Home, Store, Banknote, Package, Building2, ArrowRightLeft, 
    Activity, Undo2, ShoppingBag, Calculator, BarChart2, 
    UserCheck, Users, Briefcase, Settings 
} from 'lucide-react';

const SIDEBAR_LINKS = [
    { icon: Home, path: '', label: 'Dashboard', labelAr: 'الرئيسية' },
    { icon: Store, path: '/pos', label: 'POS', labelAr: 'نقطة البيع', highlight: true },
    { icon: Banknote, path: '/sales', label: 'Sales', labelAr: 'المبيعات' },
    { icon: Package, path: '/inventory', label: 'Inventory', labelAr: 'المخزون' },
    { icon: Building2, path: '/branches', label: 'Branches', labelAr: 'الفروع' },
    { icon: ArrowRightLeft, path: '/inventory/transfers', label: 'Transfers', labelAr: 'التحويلات' },
    { icon: Activity, path: '/inventory/movements', label: 'Movements', labelAr: 'الحركات' },
    { icon: Undo2, path: '/returns', label: 'Returns', labelAr: 'المرتجعات' },
    { icon: ShoppingBag, path: '/purchases', label: 'Purchases', labelAr: 'المشتريات' },
    { icon: Calculator, path: '/accounting', label: 'Accounting', labelAr: 'المحاسبة' },
    { icon: BarChart2, path: '/reports', label: 'Reports', labelAr: 'التقارير' },
    { icon: UserCheck, path: '/hr', label: 'HR', labelAr: 'الموارد البشرية' },
    { icon: Users, path: '/customers', label: 'Customers', labelAr: 'العملاء' },
    { icon: Briefcase, path: '/partnerships', label: 'Partnerships', labelAr: 'الشراكات' },
    { icon: Settings, path: '/settings', label: 'Settings', labelAr: 'الإعدادات' }
];

export const PosSidebar = memo(function PosSidebar({ locale, isRTL, className, onNavigate }: { locale: string, isRTL: boolean, className?: string, onNavigate?: () => void }) {
    return (
        <div className={clsx("w-16 shrink-0 bg-slate-900 dark:bg-black border-e border-slate-800 flex flex-col items-center py-4 gap-2 relative z-[60] overflow-y-auto custom-scrollbar", className)}>
            {SIDEBAR_LINKS.map(link => {
                const isPos = link.path === '/pos';
                return (
                    <Link 
                        key={link.path}
                        href={`/${locale}/dashboard${link.path}`}
                        onClick={onNavigate}
                        title={isRTL ? link.labelAr : link.label}
                        className={clsx(
                            "p-3 rounded-xl transition-colors shrink-0",
                            isPos ? "bg-blue-600/20 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]" : "text-white/40 hover:text-white hover:bg-white/10"
                        )}
                    >
                        <link.icon className="w-5 h-5"/>
                    </Link>
                );
            })}
        </div>
    );
});
