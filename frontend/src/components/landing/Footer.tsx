import Link from 'next/link';

export default function Footer({ isRTL, locale, dict }: { isRTL: boolean, locale: string, dict: any }) {
    return (
        <footer className="py-10 px-6" style={{ borderTop: '1px solid var(--border-default)' }}>
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: 'rgba(99, 102, 241, 0.12)' }}>
                        <span className="text-xs font-bold" style={{ color: 'var(--color-primary)' }}>$</span>
                    </div>
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{dict.common.appName}</span>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    © {new Date().getFullYear()} {dict.common.appName}. {isRTL ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
                </p>
                <div className="flex items-center gap-4">
                    <Link href="/en" className={`text-xs transition-colors ${locale === 'en' ? '' : ''}`}
                        style={{ color: locale === 'en' ? 'var(--color-primary)' : 'var(--text-muted)' }}>
                        English
                    </Link>
                    <Link href="/ar" className="text-xs font-arabic transition-colors"
                        style={{ color: locale === 'ar' ? 'var(--color-primary)' : 'var(--text-muted)' }}>
                        العربية
                    </Link>
                </div>
            </div>
        </footer>
    );
}
