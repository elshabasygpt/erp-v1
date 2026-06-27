'use client';

import { memo } from 'react';
import { useSidebar } from '@/providers/SidebarProvider';
import { useTheme } from '@/providers/ThemeProvider';
import NotificationCenter from '@/components/ui/NotificationCenter';

interface MobileHeaderProps {
    isRTL: boolean;
    title?: string;
    onSearchClick?: () => void;
}

const MobileHeader = memo(function MobileHeader({
    isRTL,
    title = 'ERP',
    onSearchClick,
}: MobileHeaderProps) {
    const { toggleCollapsed } = useSidebar();
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <header
            className="md:hidden fixed top-0 inset-x-0 z-30 h-14 flex items-center justify-between px-3 gap-2"
            style={{
                background: 'var(--bg-sidebar)',
                borderBottom: '1px solid var(--border-default)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
            }}
            role="banner"
            aria-label={isRTL ? 'رأس الصفحة' : 'Page header'}
        >
            {/* ── Hamburger ── */}
            <button
                onClick={toggleCollapsed}
                className="mobile-hdr-btn flex-shrink-0"
                aria-label={isRTL ? 'فتح القائمة الجانبية' : 'Open sidebar menu'}
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            {/* ── Brand ── */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
                <div
                    className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--gradient-primary)' }}
                    aria-hidden="true"
                >
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                </div>
                <span className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                    {title}
                </span>
            </div>

            {/* ── Right Actions ── */}
            <div className="flex items-center gap-0.5 flex-shrink-0">

                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="mobile-hdr-btn"
                    aria-label={isDark ? (isRTL ? 'تفعيل الوضع الفاتح' : 'Switch to light mode') : (isRTL ? 'تفعيل الوضع الداكن' : 'Switch to dark mode')}
                    title={isDark ? (isRTL ? 'وضع فاتح' : 'Light mode') : (isRTL ? 'وضع داكن' : 'Dark mode')}
                >
                    {isDark ? (
                        <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round"
                                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    ) : (
                        <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round"
                                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                    )}
                </button>

                {/* Notifications */}
                <NotificationCenter isRTL={isRTL} />

                {/* Search */}
                <button
                    onClick={onSearchClick}
                    className="mobile-hdr-btn"
                    aria-label={isRTL ? 'بحث سريع' : 'Quick search'}
                    aria-keyshortcuts="Control+K"
                    disabled={!onSearchClick}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </button>
            </div>
        </header>
    );
});

export default MobileHeader;
