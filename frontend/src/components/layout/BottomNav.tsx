'use client';

import { memo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  hrefSuffix: string;
  labelAr: string;
  labelEn: string;
  icon: (active: boolean) => React.ReactNode;
}

interface BottomNavProps {
  locale: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    hrefSuffix: '',
    labelAr: 'الرئيسية',
    labelEn: 'Home',
    icon: (active) => (
      <svg className="w-5 h-5" fill="none" stroke="currentColor"
        strokeWidth={active ? 2.5 : 2} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    hrefSuffix: '/sales',
    labelAr: 'المبيعات',
    labelEn: 'Sales',
    icon: (active) => (
      <svg className="w-5 h-5" fill="none" stroke="currentColor"
        strokeWidth={active ? 2.5 : 2} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    hrefSuffix: '/pos',
    labelAr: 'البيع',
    labelEn: 'POS',
    icon: (active) => (
      <svg className="w-5 h-5" fill="none" stroke="currentColor"
        strokeWidth={active ? 2.5 : 2} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9 7H6a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-3M9 7V5a2 2 0 012-2h6l2 2v8a2 2 0 01-2 2h-2M9 7h2a2 2 0 012 2v2" />
      </svg>
    ),
  },
  {
    hrefSuffix: '/inventory',
    labelAr: 'المخزون',
    labelEn: 'Stock',
    icon: (active) => (
      <svg className="w-5 h-5" fill="none" stroke="currentColor"
        strokeWidth={active ? 2.5 : 2} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    hrefSuffix: '/settings',
    labelAr: 'الإعدادات',
    labelEn: 'Settings',
    icon: (active) => (
      <svg className="w-5 h-5" fill="none" stroke="currentColor"
        strokeWidth={active ? 2.5 : 2} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

const BottomNav = memo(function BottomNav({ locale }: BottomNavProps) {
  const pathname = usePathname();
  const isRTL = locale === 'ar';
  const base = `/${locale}/dashboard`;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-30
        bg-white dark:bg-gray-900
        border-t border-gray-200 dark:border-gray-700"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label={isRTL ? 'التنقل السفلي' : 'Bottom navigation'}
    >
      <div className="flex items-center justify-around h-16">
        {NAV_ITEMS.map(item => {
          const href = `${base}${item.hrefSuffix}`;
          const isActive = item.hrefSuffix === ''
            ? pathname === base || pathname === `${base}/`
            : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center
                justify-center flex-1 h-full gap-1
                transition-colors duration-150
                ${isActive
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-500 dark:text-gray-500'
                }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {item.icon(isActive)}
              <span className="text-xs font-medium">
                {isRTL ? item.labelAr : item.labelEn}
              </span>
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2
                  w-8 h-0.5 bg-primary-600 dark:bg-primary-400 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
});

export default BottomNav;
