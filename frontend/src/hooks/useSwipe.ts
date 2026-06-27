'use client';

import { useRef, useCallback } from 'react';

interface SwipeHandlers {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
}

export function useSwipe(
    onSwipeLeft: (() => void) | null,
    onSwipeRight: (() => void) | null,
    options: { threshold?: number; maxDuration?: number } = {}
): SwipeHandlers {
    const { threshold = 50, maxDuration = 500 } = options;
    const startRef = useRef<{ x: number; y: number; t: number } | null>(null);

    const onTouchStart = useCallback((e: React.TouchEvent) => {
        const t = e.touches[0];
        startRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
    }, []);

    const onTouchEnd = useCallback((e: React.TouchEvent) => {
        if (!startRef.current) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - startRef.current.x;
        const dy = t.clientY - startRef.current.y;
        const dt = Date.now() - startRef.current.t;
        startRef.current = null;

        // Ignore slow, diagonal, or short swipes
        if (dt > maxDuration) return;
        if (Math.abs(dy) > Math.abs(dx) * 0.8) return;
        if (Math.abs(dx) < threshold) return;

        if (dx < 0 && onSwipeLeft) onSwipeLeft();
        else if (dx > 0 && onSwipeRight) onSwipeRight();
    }, [onSwipeLeft, onSwipeRight, threshold, maxDuration]);

    return { onTouchStart, onTouchEnd };
}
