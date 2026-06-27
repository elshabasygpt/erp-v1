'use client';
import { useState, useEffect, memo } from 'react';

const ClockWidget = memo(function ClockWidget({ isRTL }: { isRTL: boolean }) {
    const [time, setTime] = useState('');

    useEffect(() => {
        const tick = () =>
            setTime(
                new Date().toLocaleTimeString(isRTL ? 'ar-SA' : 'en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                })
            );
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [isRTL]);

    if (!time) return null;

    return (
        <div
            className="px-4 py-2.5 rounded-xl text-sm font-mono font-semibold tabular-nums hidden md:flex items-center gap-1.5 select-none"
            style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                color: 'var(--color-primary)',
            }}
            aria-label={isRTL ? 'الوقت الحالي' : 'Current time'}
            aria-live="off"
        >
            <svg className="w-3.5 h-3.5 opacity-60 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {time}
        </div>
    );
});

export default ClockWidget;
