'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DialogProps {
    isOpen: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    description?: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
    isRTL?: boolean;
    /** max-width preset */
    size?: 'sm' | 'md' | 'lg' | 'xl';
    /** Hide the default close (X) button */
    hideClose?: boolean;
    className?: string;
}

const sizes: Record<NonNullable<DialogProps['size']>, string> = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
};

/**
 * Dialog — generalized accessible modal (focus trap, Escape, backdrop close,
 * scroll-lock). Generalizes the ConfirmDialog pattern so pages stop hand-rolling
 * `.modal-overlay` markup. Provide your own footer buttons.
 */
export default function Dialog({
    isOpen,
    onClose,
    title,
    description,
    children,
    footer,
    isRTL = false,
    size = 'md',
    hideClose = false,
    className,
}: DialogProps) {
    const panelRef = React.useRef<HTMLDivElement>(null);
    const titleId = React.useId();
    const descId = React.useId();

    // Escape + scroll lock
    React.useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                onClose();
            }
        };
        window.addEventListener('keydown', onKey, true);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey, true);
            document.body.style.overflow = prevOverflow;
        };
    }, [isOpen, onClose]);

    // Focus first focusable + trap Tab
    React.useEffect(() => {
        if (!isOpen || !panelRef.current) return;
        const panel = panelRef.current;
        const sel = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
        const focusables = () => Array.from(panel.querySelectorAll<HTMLElement>(sel)).filter((el) => !el.hasAttribute('disabled'));
        requestAnimationFrame(() => focusables()[0]?.focus());

        const trap = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;
            const f = focusables();
            if (!f.length) return;
            const first = f[0];
            const last = f[f.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };
        window.addEventListener('keydown', trap);
        return () => window.removeEventListener('keydown', trap);
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-describedby={description ? descId : undefined}
            dir={isRTL ? 'rtl' : 'ltr'}
        >
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
                aria-hidden="true"
            />
            <div
                ref={panelRef}
                className={cn(
                    'relative w-full max-h-[88vh] flex flex-col rounded-2xl overflow-hidden animate-scale-in',
                    sizes[size],
                    className
                )}
                style={{ background: 'var(--bg-modal)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-modal)' }}
            >
                {(title || !hideClose) && (
                    <div
                        className="flex items-start justify-between gap-4 px-6 py-4 border-b"
                        style={{ borderColor: 'var(--border-default)' }}
                    >
                        <div className="min-w-0">
                            {title && (
                                <h2 id={titleId} className="font-heading text-lg font-bold truncate" style={{ color: 'var(--text-heading)' }}>
                                    {title}
                                </h2>
                            )}
                            {description && (
                                <p id={descId} className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                    {description}
                                </p>
                            )}
                        </div>
                        {!hideClose && (
                            <button
                                type="button"
                                onClick={onClose}
                                className="btn-icon shrink-0"
                                aria-label={isRTL ? 'إغلاق' : 'Close'}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                )}

                <div className="px-6 py-5 overflow-y-auto">{children}</div>

                {footer && (
                    <div
                        className="flex items-center justify-end gap-3 px-6 py-4 border-t"
                        style={{ borderColor: 'var(--border-default)' }}
                    >
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
