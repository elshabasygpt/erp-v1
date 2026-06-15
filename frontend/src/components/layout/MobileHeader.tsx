'use client';

import { memo, useEffect } from 'react';
import { useSidebar } from '@/providers/SidebarProvider';
import { useTheme } from '@/providers/ThemeProvider';

interface MobileHeaderProps {
  isRTL: boolean;
  title?: string;
}

const MobileHeader = memo(function MobileHeader({
  isRTL,
  title = 'ERP',
}: MobileHeaderProps) {
  const { toggleCollapsed: toggle } = useSidebar();
  const { theme, toggleTheme } = useTheme();

  return (
    <header
      className="md:hidden fixed top-0 left-0 right-0 z-30
        h-14 flex items-center justify-between px-4
        bg-white dark:bg-gray-900
        border-b border-gray-200 dark:border-gray-700"
      aria-label={isRTL ? 'رأس الصفحة' : 'Page header'}
    >
      {/* Hamburger */}
      <button
        onClick={toggle}
        className="flex items-center justify-center
          w-10 h-10 rounded-lg
          hover:bg-gray-100 dark:hover:bg-gray-800
          transition-colors"
        aria-label={isRTL ? 'فتح القائمة' : 'Open menu'}
      >
        <svg
          className="w-5 h-5 text-gray-600 dark:text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Title */}
      <span className="font-semibold text-gray-900 dark:text-white text-sm">
        {title}
      </span>

      {/* Dark mode toggle */}
      <button
        onClick={toggleTheme}
        className="flex items-center justify-center
          w-10 h-10 rounded-lg
          hover:bg-gray-100 dark:hover:bg-gray-800
          transition-colors"
        aria-label={isRTL ? 'تغيير المظهر' : 'Toggle theme'}
      >
        {theme === 'dark' ? (
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        ) : (
          <svg
            className="w-5 h-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
        )}
      </button>
    </header>
  );
});

export default MobileHeader;
