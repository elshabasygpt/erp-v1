import { useEffect, useCallback, useRef } from 'react';

/**
 * Hook to detect barcode scanner input.
 * USB barcode scanners typically type characters very rapidly (< 50ms between keystrokes)
 * and end with Enter. This hook detects that pattern.
 */
export function useBarcodeScanner(onScan: (barcode: string) => void, enabled: boolean = true) {
    const bufferRef = useRef<string>('');
    const lastKeystrokeRef = useRef<number>(0);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleKeyPress = useCallback((e: KeyboardEvent) => {
        if (!enabled) return;
        
        // Don't capture if user is typing in an input field (except the search bar)
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            // Allow barcode scanning only in the POS search input
            if (!target.classList.contains('pos-search-input')) return;
        }

        const now = Date.now();
        const timeSinceLastKeystroke = now - lastKeystrokeRef.current;

        // If Enter is pressed and we have a buffer, it's a barcode scan
        if (e.key === 'Enter' && bufferRef.current.length >= 3) {
            e.preventDefault();
            onScan(bufferRef.current);
            bufferRef.current = '';
            lastKeystrokeRef.current = 0;
            return;
        }

        // If more than 100ms since last keystroke, reset buffer (manual typing)
        if (timeSinceLastKeystroke > 100) {
            bufferRef.current = '';
        }

        // Only add printable characters
        if (e.key.length === 1) {
            bufferRef.current += e.key;
            lastKeystrokeRef.current = now;

            // Auto-clear buffer after 500ms of no input
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
                bufferRef.current = '';
            }, 500);
        }
    }, [onScan, enabled]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyPress);
        return () => {
            window.removeEventListener('keydown', handleKeyPress);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [handleKeyPress]);
}
