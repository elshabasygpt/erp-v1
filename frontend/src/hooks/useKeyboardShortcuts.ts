import { useEffect, useCallback } from 'react';

export interface ShortcutMap {
    [key: string]: () => void;
}

/**
 * Hook to handle keyboard shortcuts for POS.
 * Automatically prevents default browser behavior for F-keys.
 * 
 * Usage:
 *   useKeyboardShortcuts({
 *     'F1': () => createNewTab(),
 *     'F2': () => focusSearch(),
 *     'F8': () => checkout(),
 *     'Escape': () => closeModal(),
 *     'Ctrl+1': () => switchTab(0),
 *   });
 */
export function useKeyboardShortcuts(shortcuts: ShortcutMap, enabled: boolean = true) {
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!enabled) return;

        // Build key identifier
        const parts: string[] = [];
        if (e.ctrlKey) parts.push('Ctrl');
        if (e.altKey) parts.push('Alt');
        if (e.shiftKey) parts.push('Shift');

        // Normalize key names
        let key = e.key;
        if (key === ' ') key = 'Space';
        if (key === 'Delete') key = 'Delete';
        if (key === 'Escape') key = 'Escape';
        
        parts.push(key);
        const combo = parts.join('+');

        // Check if this combo is registered
        if (shortcuts[combo]) {
            e.preventDefault();
            e.stopPropagation();
            shortcuts[combo]();
            return;
        }

        // Also check without modifiers for F-keys
        if (key.startsWith('F') && /^F\d+$/.test(key) && shortcuts[key]) {
            e.preventDefault();
            e.stopPropagation();
            shortcuts[key]();
        }
    }, [shortcuts, enabled]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
}
