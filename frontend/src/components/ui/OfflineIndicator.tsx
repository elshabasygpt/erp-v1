'use client';

import { useState, useEffect, useRef } from 'react';

interface OfflineIndicatorProps {
    isRTL: boolean;
}

export default function OfflineIndicator({ isRTL }: OfflineIndicatorProps) {
    const [isOnline, setIsOnline] = useState(true);
    const [showReconnected, setShowReconnected] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setIsOnline(navigator.onLine);

        const handleOnline = () => {
            setIsOnline(true);
            setShowReconnected(true);
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = setTimeout(() => setShowReconnected(false), 3000);
        };
        const handleOffline = () => {
            setIsOnline(false);
            setShowReconnected(false);
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        };
    }, []);

    // Poll POS sync queue for pending offline operations
    useEffect(() => {
        const checkQueue = () => {
            try {
                const queue = JSON.parse(localStorage.getItem('pos_sync_queue') || '[]');
                setPendingCount(Array.isArray(queue) ? queue.length : 0);
            } catch {
                setPendingCount(0);
            }
        };
        checkQueue();
        const interval = setInterval(checkQueue, 5000);
        return () => clearInterval(interval);
    }, []);

    // Use left-1/2 -translate-x-1/2 for physical centering — start-1/2 breaks in RTL
    // because start-1/2 = right:50% in RTL but -translate-x-1/2 still moves left physically
    const centerClass = 'left-1/2 -translate-x-1/2';

    if (isOnline && !showReconnected && pendingCount === 0) return null;

    if (showReconnected) {
        return (
            <div
                role="status"
                aria-live="polite"
                className={`fixed bottom-4 ${centerClass} z-50 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg animate-slide-up`}
                style={{ background: '#10b981', color: 'white' }}
                dir={isRTL ? 'rtl' : 'ltr'}
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-xs font-semibold">
                    {isRTL ? 'تم الاتصال بالإنترنت' : 'Back online'}
                </span>
            </div>
        );
    }

    if (!isOnline) {
        return (
            <div
                role="alert"
                aria-live="assertive"
                className={`fixed bottom-4 ${centerClass} z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-full shadow-lg`}
                style={{ background: '#ef4444', color: 'white' }}
                dir={isRTL ? 'rtl' : 'ltr'}
            >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M12 12h.01M8.464 15.536a5 5 0 010-7.072M5.636 18.364a9 9 0 010-12.728" />
                </svg>
                <span className="text-xs font-semibold">
                    {isRTL ? 'لا يوجد اتصال بالإنترنت' : 'No internet connection'}
                </span>
                {pendingCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/30 font-bold">
                        {pendingCount} {isRTL ? 'عملية معلقة' : 'pending'}
                    </span>
                )}
            </div>
        );
    }

    if (pendingCount > 0 && isOnline) {
        return (
            <div
                role="status"
                aria-live="polite"
                className={`fixed bottom-4 ${centerClass} z-50 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg`}
                style={{ background: '#f59e0b', color: 'white' }}
                dir={isRTL ? 'rtl' : 'ltr'}
            >
                <div className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin flex-shrink-0" aria-hidden="true" />
                <span className="text-xs font-semibold">
                    {isRTL ? `جاري مزامنة ${pendingCount} عملية...` : `Syncing ${pendingCount} operations...`}
                </span>
            </div>
        );
    }

    return null;
}
