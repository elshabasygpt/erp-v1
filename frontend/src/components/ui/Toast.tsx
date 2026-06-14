'use client';

import { useState, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
    message: string;
    type?: ToastType;
    duration?: number;
    onClose?: () => void;
}

export default function Toast({ message, type = 'success', duration = 3000, onClose }: ToastProps) {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            if (onClose) setTimeout(onClose, 300); // Wait for fade out animation
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    const styles = {
        success: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30',
        error: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30',
        warning: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30',
        info: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30'
    };

    if (!isVisible && !onClose) return null;

    return (
        <div className={`fixed bottom-6 start-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-out 
            ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}
            px-4 py-3 rounded-xl border-2 shadow-lg flex items-center gap-3 font-medium text-sm
            ${styles[type]}`}
        >
            <span className="text-xl">{icons[type]}</span>
            <span>{message}</span>
            <button 
                onClick={() => setIsVisible(false)}
                className="ms-2 opacity-50 hover:opacity-100 transition-opacity"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
}

// Global Toast Manager (A simple implementation)
// Consider using a library like sonner or react-hot-toast for a more robust solution in production.
