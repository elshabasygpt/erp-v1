'use client';

import { useEffect, useRef, useId } from 'react';

interface ConfirmDialogProps {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    isRTL?: boolean;
}

export default function ConfirmDialog({
    isOpen,
    onConfirm,
    onCancel,
    title,
    message,
    confirmLabel,
    cancelLabel,
    variant = 'danger',
    isRTL = false,
}: ConfirmDialogProps) {
    const cancelRef = useRef<HTMLButtonElement>(null);
    const dialogRef = useRef<HTMLDivElement>(null);
    const titleId = useId();
    const descId = useId();

    // Focus cancel button when dialog opens
    useEffect(() => {
        if (isOpen) {
            // Defer focus to allow the dialog to render first
            const frame = requestAnimationFrame(() => cancelRef.current?.focus());
            return () => cancelAnimationFrame(frame);
        }
    }, [isOpen]);

    // Escape closes — no global Enter handler (buttons handle their own Enter natively)
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                onCancel();
            }
        };
        window.addEventListener('keydown', handleKey, true);
        return () => window.removeEventListener('keydown', handleKey, true);
    }, [isOpen, onCancel]);

    // Focus trap: keep Tab/Shift+Tab inside the dialog
    useEffect(() => {
        if (!isOpen || !dialogRef.current) return;
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        const trap = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;
            if (e.shiftKey) {
                if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
            } else {
                if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
            }
        };
        window.addEventListener('keydown', trap);
        return () => window.removeEventListener('keydown', trap);
    }, [isOpen]);

    if (!isOpen) return null;

    const icons = {
        danger: (
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        ),
        warning: (
            <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        ),
        info: (
            <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    };

    const iconBg = {
        danger: 'bg-red-100 dark:bg-red-900/30',
        warning: 'bg-amber-100 dark:bg-amber-900/30',
        info: 'bg-blue-100 dark:bg-blue-900/30',
    };

    const confirmBtnStyle = {
        danger: 'bg-red-500 hover:bg-red-600 focus-visible:ring-red-500',
        warning: 'bg-amber-500 hover:bg-amber-600 focus-visible:ring-amber-500',
        info: 'bg-blue-500 hover:bg-blue-600 focus-visible:ring-blue-500',
    };

    const defaultConfirm = isRTL ? 'تأكيد' : 'Confirm';
    const defaultCancel = isRTL ? 'إلغاء' : 'Cancel';

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onCancel}
                aria-hidden="true"
            />

            {/* Dialog — focus trap container */}
            <div
                ref={dialogRef}
                className="relative w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-scale-in"
                style={{ background: 'var(--bg-modal)', border: '1px solid var(--border-default)' }}
                dir={isRTL ? 'rtl' : 'ltr'}
            >
                {/* Icon */}
                <div className={`w-12 h-12 rounded-full ${iconBg[variant]} flex items-center justify-center mx-auto mb-4`}>
                    {icons[variant]}
                </div>

                {/* Title */}
                <h2
                    id={titleId}
                    className="text-base font-bold text-center mb-2"
                    style={{ color: 'var(--text-heading)' }}
                >
                    {title}
                </h2>

                {/* Message */}
                <p
                    id={descId}
                    className="text-sm text-center mb-6"
                    style={{ color: 'var(--text-secondary)' }}
                >
                    {message}
                </p>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        ref={cancelRef}
                        onClick={onCancel}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400"
                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                    >
                        {cancelLabel || defaultCancel}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${confirmBtnStyle[variant]}`}
                    >
                        {confirmLabel || defaultConfirm}
                    </button>
                </div>

                {/* Keyboard hint */}
                <p className="text-center text-[10px] mt-3" style={{ color: 'var(--text-muted)' }}>
                    {isRTL ? 'Tab للتنقل · Enter لتفعيل الزر المُحدد · Esc للإلغاء' : 'Tab to navigate · Enter to activate focused button · Esc to cancel'}
                </p>
            </div>
        </div>
    );
}
