'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { notificationStore, type Notification } from '@/stores/notificationStore';

interface NotificationCenterProps {
    isRTL: boolean;
}

function timeAgo(timestamp: number, isRTL: boolean): string {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return isRTL ? 'الآن' : 'now';
    if (mins < 60) return isRTL ? `منذ ${mins} د` : `${mins}m ago`;
    if (hours < 24) return isRTL ? `منذ ${hours} س` : `${hours}h ago`;
    return isRTL ? `منذ ${days} ي` : `${days}d ago`;
}

const TYPE_CONFIG = {
    success: {
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
        ),
        bg: 'bg-emerald-100 dark:bg-emerald-900/40',
        color: 'text-emerald-600 dark:text-emerald-400',
        dot: 'bg-emerald-500',
    },
    error: {
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        ),
        bg: 'bg-red-100 dark:bg-red-900/40',
        color: 'text-red-600 dark:text-red-400',
        dot: 'bg-red-500',
    },
    warning: {
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        ),
        bg: 'bg-amber-100 dark:bg-amber-900/40',
        color: 'text-amber-600 dark:text-amber-400',
        dot: 'bg-amber-500',
    },
    info: {
        icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        bg: 'bg-blue-100 dark:bg-blue-900/40',
        color: 'text-blue-600 dark:text-blue-400',
        dot: 'bg-blue-500',
    },
};

function NotificationItem({
    notification,
    isRTL,
    onRead,
    onRemove,
}: {
    notification: Notification;
    isRTL: boolean;
    onRead: (id: string) => void;
    onRemove: (id: string) => void;
}) {
    const cfg = TYPE_CONFIG[notification.type];
    const title = isRTL ? notification.titleAr : notification.titleEn;
    const message = isRTL ? notification.messageAr : notification.messageEn;

    return (
        <div
            className={`flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer group ${
                !notification.read ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''
            } hover:bg-gray-50 dark:hover:bg-white/5`}
            onClick={() => onRead(notification.id)}
            role="listitem"
        >
            {/* Type icon */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-full ${cfg.bg} ${cfg.color} flex items-center justify-center mt-0.5`}>
                {cfg.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {title}
                    </p>
                    {!notification.read && (
                        <span className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    )}
                </div>
                {message && (
                    <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
                        {message}
                    </p>
                )}
                <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                    {timeAgo(notification.timestamp, isRTL)}
                </p>
            </div>

            {/* Remove button */}
            <button
                className="flex-shrink-0 opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg flex items-center justify-center transition-all hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500"
                onClick={(e) => { e.stopPropagation(); onRemove(notification.id); }}
                aria-label={isRTL ? 'حذف الإشعار' : 'Remove notification'}
            >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
}

export default function NotificationCenter({ isRTL }: NotificationCenterProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const panelRef = useRef<HTMLDivElement>(null);
    const btnRef = useRef<HTMLButtonElement>(null);

    const refresh = useCallback(() => {
        setNotifications(notificationStore.getAll());
        setUnreadCount(notificationStore.getUnreadCount());
    }, []);

    useEffect(() => {
        refresh();
        const unsub = notificationStore.subscribe(refresh);
        return () => { unsub(); };
    }, [refresh]);

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: MouseEvent) => {
            if (
                panelRef.current && !panelRef.current.contains(e.target as Node) &&
                btnRef.current && !btnRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen]);

    // Escape to close
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen]);

    return (
        <div className="relative">
            {/* Bell Button */}
            <button
                ref={btnRef}
                onClick={() => setIsOpen(prev => !prev)}
                aria-label={isRTL ? `الإشعارات${unreadCount > 0 ? ` (${unreadCount} غير مقروء)` : ''}` : `Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                aria-expanded={isOpen}
                aria-haspopup="true"
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all relative hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)' }}
            >
                <svg className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                    <span
                        className="absolute -top-1 -end-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1 border-2 border-white dark:border-gray-900"
                        aria-hidden="true"
                    >
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Panel */}
            {isOpen && (
                <div
                    ref={panelRef}
                    role="region"
                    aria-label={isRTL ? 'مركز الإشعارات' : 'Notification center'}
                    className={`absolute top-12 ${isRTL ? 'left-0' : 'right-0'} w-80 sm:w-96 max-w-[calc(100vw-2rem)] rounded-2xl shadow-2xl overflow-hidden z-50 animate-slide-down`}
                    style={{
                        background: 'var(--bg-modal)',
                        border: '1px solid var(--border-default)',
                        boxShadow: 'var(--shadow-modal)',
                    }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border-default)' }}>
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-bold" style={{ color: 'var(--text-heading)' }}>
                                {isRTL ? 'الإشعارات' : 'Notifications'}
                            </h2>
                            {unreadCount > 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary-500/15 text-primary-600 dark:text-primary-400 font-bold">
                                    {unreadCount} {isRTL ? 'جديد' : 'new'}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={() => notificationStore.markAllRead()}
                                    className="text-[10px] font-semibold hover:underline focus-visible:outline-none"
                                    style={{ color: 'var(--color-primary)' }}
                                >
                                    {isRTL ? 'تعليم الكل كمقروء' : 'Mark all read'}
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button
                                    onClick={() => notificationStore.clearAll()}
                                    className="text-[10px] font-semibold hover:underline focus-visible:outline-none"
                                    style={{ color: 'var(--text-muted)' }}
                                >
                                    {isRTL ? 'مسح الكل' : 'Clear all'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* List */}
                    <div className="max-h-[420px] overflow-y-auto" role="list">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 px-4">
                                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                                    style={{ background: 'var(--bg-surface-secondary)' }}>
                                    <svg className="w-6 h-6" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                </div>
                                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                    {isRTL ? 'لا توجد إشعارات' : 'No notifications'}
                                </p>
                                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                    {isRTL ? 'ستظهر الإشعارات هنا' : 'Notifications will appear here'}
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
                                {notifications.map(n => (
                                    <NotificationItem
                                        key={n.id}
                                        notification={n}
                                        isRTL={isRTL}
                                        onRead={(id) => notificationStore.markRead(id)}
                                        onRemove={(id) => notificationStore.remove(id)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
