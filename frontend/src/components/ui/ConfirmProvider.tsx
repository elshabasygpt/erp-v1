'use client';

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import ConfirmDialog from './ConfirmDialog';
import { useLanguage } from '@/i18n/LanguageContext';

export interface ConfirmOptions {
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
}

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

interface DialogState extends ConfirmOptions {
    isOpen: boolean;
}

/**
 * Promise-based confirmation backed by the styled, accessible, RTL-aware
 * ConfirmDialog. Replaces the native blocking `window.confirm`:
 *
 *   const confirm = useConfirm();
 *   if (!(await confirm('هل أنت متأكد؟'))) return;
 *   if (!(await confirm({ message: '...', variant: 'danger' }))) return;
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
    const { isRTL } = useLanguage();
    const [state, setState] = useState<DialogState>({ isOpen: false, message: '' });
    const resolverRef = useRef<((result: boolean) => void) | null>(null);

    const confirm = useCallback<ConfirmFn>((options) => {
        const opts = typeof options === 'string' ? { message: options } : options;
        setState({ ...opts, isOpen: true });

        return new Promise<boolean>((resolve) => {
            resolverRef.current = resolve;
        });
    }, []);

    const settle = useCallback((result: boolean) => {
        setState((prev) => ({ ...prev, isOpen: false }));
        resolverRef.current?.(result);
        resolverRef.current = null;
    }, []);

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            <ConfirmDialog
                isOpen={state.isOpen}
                title={state.title ?? (isRTL ? 'تأكيد' : 'Confirm')}
                message={state.message}
                confirmLabel={state.confirmLabel}
                cancelLabel={state.cancelLabel}
                variant={state.variant ?? 'danger'}
                isRTL={isRTL}
                onConfirm={() => settle(true)}
                onCancel={() => settle(false)}
            />
        </ConfirmContext.Provider>
    );
}

export function useConfirm(): ConfirmFn {
    const ctx = useContext(ConfirmContext);
    if (!ctx) {
        throw new Error('useConfirm must be used within a ConfirmProvider');
    }
    return ctx;
}
