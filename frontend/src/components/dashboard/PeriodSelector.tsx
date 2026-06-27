'use client';

export type DashboardPeriod = 'today' | 'week' | 'month' | 'year';

interface PeriodSelectorProps {
    value: DashboardPeriod;
    onChange: (p: DashboardPeriod) => void;
    isRTL: boolean;
}

const OPTIONS: { value: DashboardPeriod; ar: string; en: string }[] = [
    { value: 'today', ar: 'اليوم',       en: 'Today' },
    { value: 'week',  ar: 'هذا الأسبوع', en: 'This Week' },
    { value: 'month', ar: 'هذا الشهر',   en: 'This Month' },
    { value: 'year',  ar: 'هذه السنة',   en: 'This Year' },
];

export default function PeriodSelector({ value, onChange, isRTL }: PeriodSelectorProps) {
    return (
        <div
            role="group"
            aria-label={isRTL ? 'الفترة الزمنية' : 'Time period'}
            className="flex p-1 rounded-xl gap-0.5"
            style={{ background: 'var(--bg-surface-secondary)', border: '1px solid var(--border-default)' }}
        >
            {OPTIONS.map((opt) => {
                const isActive = opt.value === value;
                return (
                    <button
                        key={opt.value}
                        onClick={() => onChange(opt.value)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
                        style={
                            isActive
                                ? {
                                      background: 'var(--color-primary)',
                                      color: '#fff',
                                      boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
                                  }
                                : {
                                      color: 'var(--text-secondary)',
                                  }
                        }
                        aria-pressed={isActive}
                    >
                        {isRTL ? opt.ar : opt.en}
                    </button>
                );
            })}
        </div>
    );
}
