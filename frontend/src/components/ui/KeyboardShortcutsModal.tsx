'use client';

import { useEffect } from 'react';

interface KeyboardShortcutsModalProps {
    isOpen: boolean;
    onClose: () => void;
    isRTL: boolean;
}

interface ShortcutGroup {
    groupAr: string;
    groupEn: string;
    shortcuts: {
        keys: string[];
        labelAr: string;
        labelEn: string;
    }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
    {
        groupAr: 'التنقل العام',
        groupEn: 'General Navigation',
        shortcuts: [
            { keys: ['Ctrl', 'K'], labelAr: 'بحث سريع', labelEn: 'Quick search' },
            { keys: ['?'], labelAr: 'عرض اختصارات لوحة المفاتيح', labelEn: 'Show keyboard shortcuts' },
            { keys: ['Esc'], labelAr: 'إغلاق النافذة / إلغاء', labelEn: 'Close modal / Cancel' },
            { keys: ['Enter'], labelAr: 'تأكيد الإجراء الحالي', labelEn: 'Confirm current action' },
            { keys: ['Tab'], labelAr: 'الانتقال بين العناصر', labelEn: 'Navigate between elements' },
        ],
    },
    {
        groupAr: 'نقطة البيع (POS)',
        groupEn: 'Point of Sale',
        shortcuts: [
            { keys: ['F1'], labelAr: 'إتمام الدفع', labelEn: 'Pay / checkout' },
            { keys: ['F2'], labelAr: 'مسح السلة', labelEn: 'Clear cart' },
            { keys: ['F3'], labelAr: 'تبويب جديد', labelEn: 'New tab' },
            { keys: ['F5'], labelAr: 'تركيز على البحث', labelEn: 'Focus search' },
        ],
    },
];

function KeyChip({ label }: { label: string }) {
    return (
        <kbd
            className="inline-flex items-center justify-center px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border shadow-sm min-w-[28px]"
            style={{
                background: 'var(--bg-body)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
            }}
        >
            {label}
        </kbd>
    );
}

export default function KeyboardShortcutsModal({ isOpen, onClose, isRTL }: KeyboardShortcutsModalProps) {
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[150] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="shortcuts-title"
            dir={isRTL ? 'rtl' : 'ltr'}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

            {/* Modal */}
            <div
                className="relative w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scale-in"
                style={{ background: 'var(--bg-modal)', border: '1px solid var(--border-default)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
                    style={{ borderColor: 'var(--border-default)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary-500/15 flex items-center justify-center">
                            <svg className="w-4 h-4 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
                            </svg>
                        </div>
                        <div>
                            <h2 id="shortcuts-title" className="text-sm font-bold" style={{ color: 'var(--text-heading)' }}>
                                {isRTL ? 'اختصارات لوحة المفاتيح' : 'Keyboard Shortcuts'}
                            </h2>
                            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                {isRTL ? 'اضغط ? في أي وقت لعرض هذه القائمة' : 'Press ? anytime to view this list'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-gray-100 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                        aria-label={isRTL ? 'إغلاق' : 'Close'}
                    >
                        <svg className="w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto p-6 grid sm:grid-cols-2 gap-6">
                    {SHORTCUT_GROUPS.map(group => (
                        <div key={group.groupEn}>
                            <h3 className="text-xs font-bold uppercase tracking-wider mb-3"
                                style={{ color: 'var(--text-muted)' }}>
                                {isRTL ? group.groupAr : group.groupEn}
                            </h3>
                            <div className="space-y-2.5">
                                {group.shortcuts.map((sc) => (
                                    <div key={sc.labelEn} className="flex items-center justify-between gap-4">
                                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                            {isRTL ? sc.labelAr : sc.labelEn}
                                        </span>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            {sc.keys.map((key, i) => (
                                                <span key={i} className="flex items-center gap-1">
                                                    {i > 0 && (
                                                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>+</span>
                                                    )}
                                                    <KeyChip label={key} />
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t flex items-center justify-center gap-1"
                    style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface-secondary)' }}>
                    <KeyChip label="Esc" />
                    <span className="text-xs ms-1" style={{ color: 'var(--text-muted)' }}>
                        {isRTL ? 'للإغلاق' : 'to close'}
                    </span>
                </div>
            </div>
        </div>
    );
}
