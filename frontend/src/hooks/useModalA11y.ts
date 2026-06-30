'use client';

import { useEffect, useRef } from 'react';

// Module-level stack of currently-open modal tokens. Only the topmost modal
// responds to Escape, so a modal opened on top of another — or a ConfirmDialog
// opened on top (delete confirmations etc.) — does not also close the ones
// beneath it on a single Escape press.
const modalStack: object[] = [];

/**
 * Accessibility for hand-rolled modal dialogs. Attach the returned ref to the
 * modal's content container (the panel, not the backdrop) and set
 * `role="dialog" aria-modal="true"` on it.
 *
 *   const modalRef = useModalA11y(isOpen, onClose);
 *   return <div ref={modalRef} role="dialog" aria-modal="true"> ... </div>;
 *
 * Provides (extracted from the proven ConfirmDialog logic):
 *  - Escape closes the dialog.
 *  - Focus is moved to the first focusable element when it opens.
 *  - Tab / Shift+Tab are trapped inside the dialog.
 *  - Focus is restored to the previously-focused element on close.
 *
 * For modals that early-return `null` when closed, pass `true` as `isOpen`.
 */
export function useModalA11y<T extends HTMLElement = HTMLDivElement>(
    isOpen: boolean,
    onClose: () => void,
) {
    const ref = useRef<T>(null);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;
    const tokenRef = useRef<object>({});

    // Track this modal on the open-modal stack while it is open.
    useEffect(() => {
        if (!isOpen) return;
        const token = tokenRef.current;
        modalStack.push(token);
        return () => {
            const i = modalStack.lastIndexOf(token);
            if (i !== -1) modalStack.splice(i, 1);
        };
    }, [isOpen]);

    // Escape closes — but only for the topmost modal, and never while a
    // ConfirmDialog (which owns Escape itself) is open on top of it.
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            if (document.querySelector('[data-confirm-dialog="true"]')) return;
            if (modalStack[modalStack.length - 1] !== tokenRef.current) return;
            e.stopPropagation();
            onCloseRef.current();
        };
        window.addEventListener('keydown', handleKey, true);
        return () => window.removeEventListener('keydown', handleKey, true);
    }, [isOpen]);

    // Move focus into the dialog on open; restore it on close.
    useEffect(() => {
        if (!isOpen) return;
        const previouslyFocused = document.activeElement as HTMLElement | null;
        const frame = requestAnimationFrame(() => {
            const first = ref.current?.querySelector<HTMLElement>(
                'button, [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            first?.focus();
        });
        return () => {
            cancelAnimationFrame(frame);
            previouslyFocused?.focus?.();
        };
    }, [isOpen]);

    // Trap Tab / Shift+Tab inside the dialog.
    useEffect(() => {
        if (!isOpen) return;
        const trap = (e: KeyboardEvent) => {
            if (e.key !== 'Tab' || !ref.current) return;
            const focusable = ref.current.querySelectorAll<HTMLElement>(
                'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first) { e.preventDefault(); last.focus(); }
            } else {
                if (document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        };
        window.addEventListener('keydown', trap);
        return () => window.removeEventListener('keydown', trap);
    }, [isOpen]);

    return ref;
}
